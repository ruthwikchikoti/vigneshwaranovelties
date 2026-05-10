-- Realistic seed data for Vigneshwara Novelties.
-- Run after 0001_initial.sql.

insert into public.categories (id, slug, name_en, name_te, description_en, description_te, image_url, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', 'jewelry', 'Jewelry', 'నగలు',
    'Handpicked heirlooms — gold, silver and precious stones.',
    'ఎంపిక చేసిన వారసత్వం — బంగారం, వెండి మరియు రత్నాలు.',
    'https://picsum.photos/seed/vn-jewelry/1200/1500', 1),
  ('00000000-0000-0000-0000-000000000002', 'silver', 'Silver Articles', 'వెండి సామాన్లు',
    'Pooja sets, idols and dining silver.',
    'పూజ సెట్లు, విగ్రహాలు మరియు డైనింగ్ వెండి.',
    'https://picsum.photos/seed/vn-silver/1200/1500', 2),
  ('00000000-0000-0000-0000-000000000003', 'gift-articles', 'Gift Articles', 'బహుమతుల సామాన్లు',
    'Curated gifting for festivals and milestones.',
    'పండుగలు మరియు మైలురాళ్ల కోసం ఎంపిక చేసిన బహుమతులు.',
    'https://picsum.photos/seed/vn-gifts/1200/1500', 3),
  ('00000000-0000-0000-0000-000000000004', 'watches', 'Watches', 'గడియారాలు',
    'Heritage timepieces.', 'వారసత్వ గడియారాలు.',
    'https://picsum.photos/seed/vn-watches/1200/1500', 4),
  ('00000000-0000-0000-0000-000000000005', 'decorative', 'Decorative', 'అలంకరణ',
    'Pieces that elevate every room.', 'ప్రతి గదిని ఎత్తిపట్టే ముక్కలు.',
    'https://picsum.photos/seed/vn-decor/1200/1500', 5),
  ('00000000-0000-0000-0000-000000000006', 'festival-collection', 'Festival Collection', 'పండుగ కలెక్షన్',
    'For Diwali, Sankranti, weddings and beyond.',
    'దీపావళి, సంక్రాంతి, వివాహాలు మరియు మరిన్నింటికి.',
    'https://picsum.photos/seed/vn-festival/1200/1500', 6);

insert into public.banners (title, desktop_image_url, mobile_image_url, link_url, position, sort_order)
values
  ('Heirloom collection', 'https://picsum.photos/seed/vn-hero/2400/1200',
    'https://picsum.photos/seed/vn-hero/1080/1440', '/category/jewelry', 'hero', 1);

insert into public.offers (title_en, title_te, description_en, description_te, banner_url, discount_pct, ends_at, is_active)
values
  ('Wedding Season Atelier', 'వివాహ సీజన్ ఆట్లియర్',
    'Up to 15% off on bridal jewelry, made-to-order included.',
    'వధువు నగలపై 15% వరకు ఆఫర్, ఆర్డర్‌పై తయారుచేసేవి కూడా.',
    'https://picsum.photos/seed/vn-offer-wedding/2000/800', 15, '2026-12-31', true),
  ('Festive Silver Sale', 'పండుగ వెండి అమ్మకం',
    'Festive savings on pooja sets.', 'పూజ సెట్లపై పండుగ ఆదా.',
    'https://picsum.photos/seed/vn-offer-silver/2000/800', 10, '2026-06-30', true);

insert into public.cms_pages (slug, title_en, content_en, title_te, content_te) values
  ('about', 'About Us', '<p>Three generations of jewelers since 1998.</p>', 'మా గురించి', '<p>1998 నుండి మూడు తరాల ఆభరణకారులు.</p>'),
  ('contact', 'Contact', '<p>WhatsApp +91 9866777053</p>', 'సంప్రదించండి', '<p>వాట్సాప్ +91 9866777053</p>');

insert into public.settings (key, value) values
  ('store', '{"name":"Vigneshwara Novelties","established":1998,"address":"Main Bazaar Road, Andhra Pradesh","whatsapp":"+919866777053","email":"hivexlabsx@gmail.com"}'::jsonb),
  ('socials', '{"instagram":"https://instagram.com/vigneshwaranovelties","facebook":"https://facebook.com/vigneshwaranovelties"}'::jsonb);
