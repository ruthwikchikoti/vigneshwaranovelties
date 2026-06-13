# Vigneshwara Novelties

A premium digital showroom for Vigneshwara Novelties — jewelry, silver and gift articles.  Inquiry-based (no payment gateway). Mobile-first, Modern Heirloom aesthetic.

**Stack:** Next.js 15 · TypeScript · Tailwind v4 · Supabase · Vercel · ImageKit · Brevo · next-intl (EN/TE)

---

## 1. Local development

```bash
npm install
npm run dev    # http://localhost:3000
```

Catalog and CMS content come from Supabase once env vars are set; without them the storefront shows empty sections. Admin panel renders behind a dev-bypass (`ADMIN_DEV_BYPASS=true` in `.env.local`).

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
4. `supabase/seed.sql` is optional (empty by default); add categories and products from `/admin` instead.
5. In **Storage**, create a public bucket named `product-images`.
6. **Create the admin user** with a known password (no email link, no rate limits):

   ```bash
   npm run admin:create -- vigneshwaranovelties@gmail.com YourPassword
   ```

   The script talks to Supabase's Auth Admin REST API directly. Re-run with a new password to change it later.
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
2. Generate an API key → `RESEND_API_KEY`.
3. Set `INQUIRY_NOTIFICATION_EMAIL` to where you want inquiries delivered (e.g. your gmail).
4. (Optional) For a custom **FROM** address, verify your own domain at Resend → DNS Records, then set `INQUIRY_FROM_EMAIL=inquiries@yourdomain.com`.
5. Until you verify a domain, the app sends from Resend's shared sender `Vigneshwara Novelties <onboarding@resend.dev>` automatically. Gmail/Yahoo/Outlook addresses **cannot** be used as the FROM (Resend rejects them).

When a customer submits an order, the owner receives a formatted email with all details + click-to-WhatsApp links. Replies go straight back to the gmail address.

---

## 5. Deploy to Vercel

Zero-config — Vercel auto-detects Next.js. The simplest path:

1. Push the repo to GitHub.
2. At https://vercel.com → **Add New… → Project** → import the repo. Framework "Next.js" is detected; leave the build settings default.
3. In **Settings → Environment Variables**, paste every var from `.env.example` (Supabase, ImageKit URL, Brevo, OpenAI, site/owner vars). Set them for **Production** (and Preview if you want).
4. **Deploy.** Every push to `main` auto-deploys after that.

For a custom domain: **Project → Settings → Domains → Add**, then point your DNS as Vercel instructs.

> Note: Vercel's free **Hobby** tier is officially non-commercial. An inquiry-only catalog is a grey area; if you ever need to be fully compliant, upgrade to **Pro ($20/mo)**.

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
  data.ts               # Public data fetchers (Supabase; empty when unset or on error)
  cart-store.ts         # Zustand inquiry cart (localStorage-persisted)
  whatsapp.ts           # Click-to-chat URL builder
  imagekit.ts           # ImageKit URL helper
i18n/
  routing.ts            # Locale config
  request.ts            # Server message loader
messages/               # en.json / te.json
supabase/
  migrations/           # SQL schema + RLS
  seed.sql              # Optional SQL hooks (empty by default)
public/                 # favicons, robots.txt
```

---

## 8. Cost estimate

All free-tier:
- Vercel (Hobby) — 100GB bandwidth/mo (non-commercial; Pro $20/mo if enforced)
- Supabase — 500MB DB, 1GB storage, 2GB egress
- ImageKit — 20GB bandwidth/mo
- Brevo — 300 emails/day
- OpenAI image generation — pay-per-image (admin AI Studio only)
- Domain — ~₹800/yr only ongoing cost

Realistic capacity: ~50K monthly visitors at ₹65/mo (domain only).

---

Built with care, for an heirloom that deserves a digital home.
