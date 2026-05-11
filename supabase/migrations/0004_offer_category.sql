-- Tie each offer to a category so its discount_pct applies to every product
-- in that category while the offer is active (between starts_at and ends_at).
--
-- Setting it to null means the offer is a marketing band only (no automatic
-- discount applied — admin sets per-product sale prices manually).

alter table public.offers
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists offers_category_active on public.offers (category_id, is_active);
