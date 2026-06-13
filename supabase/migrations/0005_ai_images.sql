-- Vigneshwara Novelties — AI product image pipeline
-- Adds: ai_image_jobs (tracking) + AI/approval columns on product_images.
-- Run after 0001..0004 in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────
-- ai_image_jobs — one row per (product, source fingerprint).
-- The fingerprint hashes the ordered source photo URLs + count + model,
-- so re-saving the same photos does not spawn a duplicate full run.
-- ─────────────────────────────────────────────────────────
do $$ begin
  create type ai_job_status as enum ('queued', 'running', 'completed', 'failed', 'partial');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ai_image_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_fingerprint text not null,
  status ai_job_status not null default 'queued',
  model text,
  variants_total int not null default 0,
  variants_done int not null default 0,
  variants_failed int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_image_jobs_product on public.ai_image_jobs (product_id, created_at desc);
-- Idempotency key: one job per product per source fingerprint.
create unique index if not exists ai_image_jobs_fingerprint
  on public.ai_image_jobs (product_id, source_fingerprint);

-- ─────────────────────────────────────────────────────────
-- Extend product_images with AI provenance + approval state.
--  ai_status: 'none'     → an original photo the owner uploaded
--             'pending'  → AI image awaiting owner review
--             'approved' → AI image shown on storefront
--             'rejected' → AI image hidden (kept for audit / retry)
-- For an AI row, original_url stores the SOURCE photo it was derived from
-- (provenance, satisfies NOT NULL) and ai_generated_url stores the result.
-- ─────────────────────────────────────────────────────────
alter table public.product_images
  add column if not exists ai_status text not null default 'none',
  add column if not exists ai_variant text,
  add column if not exists ai_prompt text,
  add column if not exists ai_model text,
  add column if not exists ai_job_id uuid references public.ai_image_jobs(id) on delete set null;

create index if not exists product_images_ai_status
  on public.product_images (product_id, ai_status);

-- ─────────────────────────────────────────────────────────
-- RLS — jobs are admin-only. Service role (used by the API routes)
-- bypasses RLS; this policy is for any authenticated dashboard reads.
-- ─────────────────────────────────────────────────────────
alter table public.ai_image_jobs enable row level security;

do $$ begin
  create policy "admin full ai_image_jobs" on public.ai_image_jobs
    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
exception
  when duplicate_object then null;
end $$;

-- keep updated_at fresh (reuses set_updated_at() from 0001_initial.sql)
drop trigger if exists ai_image_jobs_updated_at on public.ai_image_jobs;
create trigger ai_image_jobs_updated_at before update on public.ai_image_jobs
  for each row execute function set_updated_at();
