# Vigneshwara Novelties

A premium digital showroom for Vigneshwara Novelties — jewelry, silver and gift articles. Inquiry-based (no payment gateway). Mobile-first, Modern Heirloom aesthetic.

**Stack:** Next.js 15 · TypeScript · Tailwind v4 · Supabase · Cloudflare Pages · ImageKit · Resend · next-intl (EN/TE)

---

## 1. Local development

```bash
npm install
npm run dev    # http://localhost:3000
```

The site renders with realistic demo data even before Supabase is configured. Admin panel renders behind a dev-bypass (`ADMIN_DEV_BYPASS=true` in `.env.local`).

### Type-check
```bash
npm run typecheck
```

---

## 2. Connect Supabase (production)

1. Create a project at https://supabase.com (free tier).
2. From **Project Settings → API** copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. In **SQL Editor**, run `supabase/migrations/0001_initial.sql` (creates schema + RLS).
4. Optionally run `supabase/seed.sql` for demo categories/offers.
5. In **Storage**, create a public bucket named `product-images`.
6. In **Authentication → Users**, invite your father with his email — he'll set a password on first sign-in.
7. Remove `ADMIN_DEV_BYPASS=true` from `.env.local`.

---

## 3. Connect ImageKit (image CDN)

1. Create a free account at https://imagekit.io.
2. **Developer Options** → copy URL endpoint → `NEXT_PUBLIC_IMAGEKIT_URL`.
3. **External Storage** → add Supabase Storage as origin (URL pattern: `https://YOUR_PROJECT.supabase.co/storage/v1/object/public/product-images/*`).
4. Now product images upload to Supabase Storage and serve through ImageKit's free CDN with WebP/AVIF + responsive resizing.

---

## 4. Connect Resend (inquiry emails)

1. Create a free account at https://resend.com (3000 emails/mo free).
2. Add and verify your sending domain (e.g. `vigneshwaranovelties.com`).
3. Generate an API key → `RESEND_API_KEY`.
4. Set `INQUIRY_NOTIFICATION_EMAIL` to the owner's email.
5. Set `INQUIRY_FROM_EMAIL` to a verified sender on your domain.

When a customer submits an inquiry, the owner receives a formatted email with all details + click-to-WhatsApp links.

---

## 5. Deploy to Cloudflare Pages

The free tier supports unlimited bandwidth and commercial use.

```bash
npm install -g wrangler                        # one-time
wrangler login                                 # one-time
npm run pages:deploy                           # builds + deploys
```

Or wire up a GitHub repo in the Cloudflare dashboard for auto-deploys on push.

In the Cloudflare dashboard, set the env vars from `.env.example` (Supabase, ImageKit, Resend, etc.). Make sure to also set `nodejs_compat` compatibility flag (already in `wrangler.toml`).

For a custom domain, point your DNS to Cloudflare and bind it in **Pages → Custom domains**.

---

## 6. Daily admin operations

The admin panel lives at `/admin`. Sign in with the email + password set in Supabase.

- **Add a product** — `/admin/products/new`. Tap the camera icon to take a photo with your phone (auto-compresses), fill the form, save.
- **Mark an inquiry as contacted** — `/admin/inquiries`. Tap any inquiry to expand, then "Mark contacted" or "Mark completed". WhatsApp & call buttons are right there.
- **Manage categories** — `/admin/categories`.

---

## 7. Project structure

```
app/
  [locale]/             # Public site (en/te)
  admin/                # Admin panel (auth-gated)
  api/                  # Inquiry + admin endpoints
components/
  brand/                # Logo, monogram, wordmark SVGs
  ui/                   # Button, Modal, Badge primitives
  layout/               # Header, Footer, MobileBottomNav
  product/              # ProductCard, BuyNowModal, etc.
  sections/             # Hero, ProductGrid, CategoryStrip, etc.
  forms/                # InquiryForm
  cart/                 # CartView
  admin/                # AdminNav, ProductForm, ImageUploader, InquiriesTable
lib/
  supabase/             # Server + browser clients
  admin/                # Auth + admin queries
  validations/          # Zod schemas
  data.ts               # Public data fetchers (Supabase + demo fallback)
  cart-store.ts         # Zustand inquiry cart (localStorage-persisted)
  whatsapp.ts           # Click-to-chat URL builder
  imagekit.ts           # ImageKit URL helper
i18n/
  routing.ts            # Locale config
  request.ts            # Server message loader
messages/               # en.json / te.json
supabase/
  migrations/           # SQL schema + RLS
  seed.sql              # Demo data
public/                 # favicons, robots.txt
```

---

## 8. Cost estimate

All free-tier:
- Cloudflare Pages — unlimited bandwidth
- Supabase — 500MB DB, 1GB storage, 2GB egress
- ImageKit — 20GB bandwidth/mo
- Resend — 3000 emails/mo
- Domain — ~₹800/yr only ongoing cost

Realistic capacity: ~50K monthly visitors at ₹65/mo (domain only).

---

Built with care, for an heirloom that deserves a digital home.
