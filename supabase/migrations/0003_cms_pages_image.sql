-- Add an optional hero image per CMS page (about, contact, terms, etc.).
-- The owner picks the image from /admin/cms/[slug]; public pages render it
-- in place of the hardcoded placeholder.

alter table public.cms_pages
  add column if not exists image_url text;
