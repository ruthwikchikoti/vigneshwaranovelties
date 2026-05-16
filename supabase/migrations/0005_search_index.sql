-- Trigram-based product search
--
-- Enables fuzzy, typo-tolerant search across product titles, descriptions,
-- tags, and category names.  Uses pg_trgm with a GIN index so queries stay
-- fast even with thousands of products.
--
-- The search_text column is trigger-maintained (not GENERATED) because it
-- includes the parent category name which lives in another table.
--
-- Assumptions:
--   - pg_trgm.similarity_threshold is left at its default (0.3).
--     If a DBA changes this globally, search behavior will change.
--     The RPC uses word_similarity() for per-word matching rather than
--     whole-document similarity() to avoid score dilution on long blobs.
--   - The backfill UPDATE runs in a single transaction.  This is fine for
--     catalogs up to a few thousand products.  For larger tables, batch
--     the update (e.g. by id range) to avoid long-held locks.

create extension if not exists pg_trgm;

-- ── helper: build the searchable text blob ──────────────────────────
-- Concatenates every field a customer might type into the search bar.
-- Called by the trigger on products and by a category-update trigger.

create or replace function build_product_search_text(
  p_title_en     text,
  p_title_te     text,
  p_desc_en      text,
  p_desc_te      text,
  p_tags         text[],
  p_category_id  uuid
) returns text
language sql stable as $$
  select concat_ws(' ',
    p_title_en,
    p_title_te,
    p_desc_en,
    p_desc_te,
    array_to_string(p_tags, ' '),
    (select concat_ws(' ', c.name_en, c.name_te)
       from public.categories c
      where c.id = p_category_id)
  );
$$;

-- ── add the column ──────────────────────────────────────────────────

alter table public.products
  add column if not exists search_text text not null default '';

-- ── GIN trigram index ───────────────────────────────────────────────

create index if not exists products_search_trgm
  on public.products using gin (search_text gin_trgm_ops);

-- ── trigger: keep search_text in sync on product changes ────────────

create or replace function trg_product_search_text()
returns trigger as $$
begin
  new.search_text := build_product_search_text(
    new.title_en,
    new.title_te,
    new.description_en,
    new.description_te,
    new.tags,
    new.category_id
  );
  return new;
end;
$$ language plpgsql;

create trigger products_search_text_sync
  before insert or update on public.products
  for each row execute function trg_product_search_text();

-- ── trigger: refresh search_text when a category name changes ───────

create or replace function trg_category_name_changed()
returns trigger as $$
begin
  -- Handle category deletion: rebuild search_text for products whose
  -- category_id was just set to NULL by the FK ON DELETE SET NULL.
  if tg_op = 'DELETE' then
    update public.products
       set search_text = build_product_search_text(
             title_en, title_te, description_en, description_te, tags, category_id
           )
     where category_id is null
       and search_text ilike '%' || coalesce(old.name_en, '') || '%';
    return old;
  end if;

  -- Handle category name update: rebuild search_text for affected products.
  if old.name_en is distinct from new.name_en
     or old.name_te is distinct from new.name_te then
    update public.products
       set search_text = build_product_search_text(
             title_en, title_te, description_en, description_te, tags, category_id
           )
     where category_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger categories_name_search_sync
  after update or delete on public.categories
  for each row execute function trg_category_name_changed();

-- ── back-fill existing rows ─────────────────────────────────────────

update public.products
   set search_text = build_product_search_text(
         title_en, title_te, description_en, description_te, tags, category_id
       );

-- ── RPC: search_products ────────────────────────────────────────────
-- Returns active products ranked by word-level trigram similarity.
-- Uses word_similarity() instead of similarity() so that a short query
-- like "silvr" is compared against individual words in the search_text
-- blob rather than the entire concatenated string — this prevents score
-- dilution from long descriptions and gives reliable typo tolerance.
-- Falls back to ILIKE when the query is very short (1-2 chars) since
-- trigram similarity needs at least 3 characters to work well.
--
-- result_limit is capped at 200 to prevent full-table scans.

create or replace function search_products(
  query        text,
  result_limit int default 60
)
returns setof public.products
language sql stable
security invoker
as $$
  -- Escape LIKE-special characters so user input like "50%" or "a_b"
  -- is treated literally in the ILIKE clauses.
  with params as (
    select replace(replace(query, '%', '\%'), '_', '\_') as safe_query
  )
  select p.*
    from public.products p, params
   where p.is_active = true
     and (
       case
         when length(query) < 3 then
           p.search_text ilike '%' || params.safe_query || '%'
         else
           -- word_similarity checks if the query appears as a whole word
           -- (or close match) anywhere in search_text, which is far more
           -- effective than whole-document similarity() on long blobs.
           query <% p.search_text
           or p.search_text ilike '%' || params.safe_query || '%'
       end
     )
   order by
     case when length(query) >= 3
       then greatest(
         word_similarity(query, p.title_en),
         word_similarity(query, p.title_te),
         word_similarity(query, p.search_text)
       )
       else 0
     end desc,
     p.sort_order
   limit least(result_limit, 200);
$$;
