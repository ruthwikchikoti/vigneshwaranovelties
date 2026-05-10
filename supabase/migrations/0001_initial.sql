-- Vigneshwara Novelties — initial schema
-- Run this against a fresh Supabase project.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  name_en text not null,
  name_te text,
  description_en text,
  description_te text,
  image_url text,
  banner_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index categories_active_sort on public.categories (is_active, sort_order);
create index categories_parent on public.categories (parent_id);

-- ─────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────
create type stock_status as enum ('in_stock', 'made_to_order', 'sold_out');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text,
  title_en text not null,
  title_te text,
  description_en text,
  description_te text,
  price_inr numeric(12,2) not null,
  discount_price_inr numeric(12,2),
  category_id uuid references public.categories(id) on delete set null,
  tags text[] default '{}',
  stock_status stock_status not null default 'in_stock',
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  is_new_arrival boolean not null default false,
  has_sale_badge boolean not null default false,
  has_offer_badge boolean not null default false,
  video_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category on public.products (category_id, is_active, sort_order);
create index products_featured on public.products (is_featured) where is_active;
create index products_trending on public.products (is_trending) where is_active;
create index products_new_arrival on public.products (is_new_arrival) where is_active;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  original_url text not null,
  optimized_url text,
  ai_generated_url text,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false
);
create index product_images_product on public.product_images (product_id, sort_order);

-- ─────────────────────────────────────────────────────────
-- offers + banners + cms
-- ─────────────────────────────────────────────────────────
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_te text,
  description_en text,
  description_te text,
  banner_url text,
  discount_pct int,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true
);
create index offers_active on public.offers (is_active, ends_at);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desktop_image_url text,
  mobile_image_url text,
  link_url text,
  position text not null default 'hero',
  sort_order int not null default 0,
  is_active boolean not null default true
);
create index banners_position on public.banners (position, is_active, sort_order);

create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_te text,
  content_en text,
  content_te text,
  updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null,
  title_en text,
  title_te text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  config jsonb default '{}'::jsonb
);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ─────────────────────────────────────────────────────────
-- inquiries (the only writable-by-anon table)
-- ─────────────────────────────────────────────────────────
create type inquiry_status as enum ('new', 'contacted', 'completed', 'spam');
create type inquiry_source as enum ('buy_now', 'cart', 'whatsapp_redirect');

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  mobile text not null,
  address text,
  message text,
  items jsonb not null default '[]'::jsonb,
  status inquiry_status not null default 'new',
  source inquiry_source not null default 'cart',
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  notes text
);
create index inquiries_status_created on public.inquiries (status, created_at desc);

-- ─────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.offers enable row level security;
alter table public.banners enable row level security;
alter table public.cms_pages enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.settings enable row level security;
alter table public.inquiries enable row level security;

-- Public read for catalog & CMS data
create policy "public read categories" on public.categories
  for select using (is_active = true);
create policy "public read products" on public.products
  for select using (is_active = true);
create policy "public read product_images" on public.product_images
  for select using (true);
create policy "public read offers" on public.offers
  for select using (is_active = true);
create policy "public read banners" on public.banners
  for select using (is_active = true);
create policy "public read cms_pages" on public.cms_pages
  for select using (true);
create policy "public read homepage_sections" on public.homepage_sections
  for select using (is_active = true);
create policy "public read settings" on public.settings
  for select using (true);

-- Anyone can submit an inquiry; nobody (except service-role) can read
create policy "anon can insert inquiry" on public.inquiries
  for insert with check (true);

-- Authenticated admin (any signed-in user) gets full access to everything
create policy "admin full categories" on public.categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full products" on public.products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full product_images" on public.product_images
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full offers" on public.offers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full banners" on public.banners
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full cms_pages" on public.cms_pages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full homepage_sections" on public.homepage_sections
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full settings" on public.settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin full inquiries" on public.inquiries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────
-- updated_at trigger for products
-- ─────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at before update on public.products
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────
-- Storage bucket for product images (run separately in Supabase Storage UI
-- or via the supabase CLI: supabase storage create product-images --public)
-- ─────────────────────────────────────────────────────────
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
