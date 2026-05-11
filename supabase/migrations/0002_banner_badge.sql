-- Add an optional badge label that overlays the banner image.
-- e.g. "DIWALI EDIT", "NEW SEASON", "20% OFF" — kept short and ALL-CAPS.

alter table public.banners
  add column if not exists badge_text text;
