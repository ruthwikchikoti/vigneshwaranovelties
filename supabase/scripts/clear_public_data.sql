-- =============================================================================
-- ONE-OFF: wipe all app data in public schema (catalog, CMS, settings, leads)
-- =============================================================================
-- Run manually in Supabase → SQL Editor when you want an empty database.
-- Do NOT add this file as a migration (it would wipe production on apply).
--
-- Keeps: table definitions, RLS, triggers, auth.users (your admin login).
-- Removes: categories, products, images, offers, banners, CMS pages, homepage
--          sections, settings rows, customer inquiries.
--
-- To keep customer inquiries: delete `public.inquiries` from the list below.
-- To keep announcement / hero / home editorial settings: delete `public.settings`.
--
-- After running, re-add content from /admin. Optional: empty Storage below.
-- =============================================================================

begin;

truncate table
  public.product_images,
  public.products,
  public.offers,
  public.banners,
  public.cms_pages,
  public.homepage_sections,
  public.settings,
  public.inquiries,
  public.categories
restart identity cascade;

commit;

-- -----------------------------------------------------------------------------
-- Optional: delete uploaded files in the product-images bucket (uncomment)
-- -----------------------------------------------------------------------------
-- delete from storage.objects where bucket_id = 'product-images';
