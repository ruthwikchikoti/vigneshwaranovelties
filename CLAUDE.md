# CLAUDE.md — AI Product Image Pipeline

Context for **Claude Code** (and other agents) taking over **AI-generated product imagery** for [Vigneshwara Novelties](https://vigneshwaranovelties.com): a jewelry / silver / gift-article showroom (inquiry-based, no checkout).

---

## 1. Project overview

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 15** (App Router), TypeScript, React 19 |
| Styling | Tailwind v4, “Modern Heirloom” aesthetic |
| Data | **Supabase** (Postgres + Auth + Storage), RLS on public tables |
| i18n | **next-intl** — English (`en`) + Telugu (`te`) under `app/[locale]/` |
| Images CDN | **ImageKit** (`lib/imagekit.ts`) — origin = Supabase public `product-images` bucket |
| Email | Brevo (inquiry notifications) |
| Deploy | **Vercel** (zero-config Next.js; env vars in project settings) |
| Admin | `/admin` — Supabase auth; dev bypass via `ADMIN_DEV_BYPASS=true` |

**Business flow today:** Owner (father) photographs products on phone → admin uploads via `ImageUploader` → saves product → storefront shows `original_url` only. **`ai_generated_url` exists in schema but is never written or displayed.**

See also: `README.md`, `project.md` (§ AI Integration Planning).

---

## 2. Product image pipeline — goal & acceptance criteria

### Goal

After the owner **uploads and saves** a product (one or more source photos), the system should **automatically generate N additional images** (default **4–5**, **configurable**) per product, e.g.:

- Macro / detail closeups  
- Model wearing the piece (where appropriate)  
- Lifestyle / premium background variants  

Generation must use **cloud APIs only** (no self-hosted GPU / ComfyUI on a home server).

**Human-in-the-loop:** Generated images are **not** shown on the public storefront until **admin approval**. Father reviews quality before publish.

### Acceptance criteria (MVP+)

1. **Trigger:** Product create/update with at least one `original_url` enqueues an idempotent AI job (no duplicate full runs for the same product version unless explicitly re-triggered).
2. **Count:** `AI_IMAGES_PER_PRODUCT` (env, default `5`) variants with distinct prompts/templates (closeup, model, lifestyle, etc.).
3. **Storage:** Each successful variant is uploaded to Supabase `product-images` (or a dedicated prefix, e.g. `ai/{product_id}/`) and linked on `product_images` — use **`ai_generated_url`** (and optionally `optimized_url` if you add a post-process step).
4. **Approval:** New rows or a status field distinguish **pending** vs **approved**; only approved AI images affect storefront (see phased rollout below).
5. **Failure:** Partial success is OK; failures are logged and visible in admin (retry button).
6. **Cost control:** Configurable cap per product / per day; no unbounded loops.
7. **SKU fidelity:** Prompts must reference product title, category, and **preserve jewelry appearance** (shape, stones, metal tone); flag low-confidence outputs for review.
8. **Idempotency:** Re-saving the same image set without changes should not spawn duplicate Bedrock calls (hash `original_url` list + product id).

### Out of scope for first ship (see §7)

Replacing the owner’s photos entirely, video, 360°, or fully automated publish without review.

---

## 3. Current codebase map (verified paths)

### Admin UI

| Path | Role |
|------|------|
| `app/admin/(dashboard)/products/page.tsx` | Product list |
| `app/admin/(dashboard)/products/new/page.tsx` | New product → `ProductForm` |
| `app/admin/(dashboard)/products/[id]/page.tsx` | Edit product → `ProductForm` |
| `components/admin/ProductForm.tsx` | Form state; `imageUrls` → `images` in API body; uses `ImageUploader` |
| `components/admin/ImageUploader.tsx` | Client compression (webp) → `POST /api/admin/upload-image` |

### Admin API

| Path | Role |
|------|------|
| `app/api/admin/upload-image/route.ts` | Auth via `getAdminUser()`; uploads to Supabase bucket **`product-images`**; returns `{ url }` public URL; **edge** runtime; dev fallback → picsum placeholder |
| `app/api/admin/products/route.ts` | `POST` create product + `product_images` rows (`original_url` only) |
| `app/api/admin/products/[id]/route.ts` | `PATCH` replace all images; `DELETE` product |
| `app/api/admin/products/[id]/duplicate/route.ts` | Duplicates product + copies `original_url` rows |
| `lib/validations/product.ts` | `productPayloadSchema` — `images: string[]` URLs |
| `lib/admin/auth.ts` | Admin session / dev bypass |
| `lib/admin/queries.ts` | `adminGetProducts()` — `images:product_images(*)` |

### Storefront

| Path | Role |
|------|------|
| `components/product/ProductGallery.tsx` | Uses **`original_url` only** (ignores `ai_generated_url` today) |
| `components/product/ProductCard.tsx` | Primary/secondary from `original_url` |
| `app/[locale]/product/[slug]/page.tsx` | Renders `ProductGallery` |
| `lib/data.ts` | Public catalog queries with `product_images` |

### Schema & types

| Path | Role |
|------|------|
| `supabase/migrations/0001_initial.sql` | `product_images`: `original_url`, `optimized_url`, **`ai_generated_url`**, `sort_order`, `is_primary` |
| `lib/supabase/types.ts` | `ProductImage` type includes `ai_generated_url` |

### Related docs

| Path | Role |
|------|------|
| `project.md` | § AI Integration Planning — intended workflow (upload → generate → review → publish) |

**Gap:** No job queue, no Bedrock SDK, no admin UI for AI review, no writes to `ai_generated_url`.

---

## 4. Recommended architecture

```
┌─────────────┐     save      ┌──────────────────┐     enqueue     ┌─────────────────┐
│ ProductForm │──────────────►│ products API     │───────────────►│ ai_image_jobs   │
│ + upload    │               │ product_images   │                │ (new table)     │
└─────────────┘               └──────────────────┘                └────────┬────────┘
                                                                             │
                    ┌────────────────────────────────────────────────────────┘
                    ▼
         ┌──────────────────────┐     InvokeModel      ┌──────────────────┐
         │ Worker / API route     │─────────────────────►│ Amazon Bedrock   │
         │ (Node runtime)         │◄─────────────────────│ Nova / Titan     │
         └──────────┬───────────┘     base64 image       └──────────────────┘
                    │ download source from public URL
                    │ upload PNG/WebP → Supabase Storage
                    ▼
         ┌──────────────────────┐     approve          ┌──────────────────┐
         │ product_images rows    │─────────────────────►│ Storefront       │
         │ ai_generated_url set   │   (approved only)    │ ProductGallery   │
         └──────────────────────┘                      └──────────────────┘
```

### Design decisions

1. **Async jobs** — Bedrock image calls take seconds; do not block `ProductForm` submit. Return immediately; poll or SSE in admin for status.
2. **Admin approval before storefront** — Add `ai_status` (`pending` | `approved` | `rejected`) on `product_images` or a child table `product_ai_images`. Storefront prefers approved `ai_generated_url` only when explicitly enabled per image.
3. **Runtime** — Existing admin routes use **`export const runtime = "edge"`**. `@aws-sdk/client-bedrock-runtime` needs **Node.js** (or a separate worker: Cloudflare Worker with fetch to Bedrock is possible but IAM signing is easier on Node). Prefer a dedicated route e.g. `app/api/admin/ai/generate/route.ts` with `runtime = "nodejs"` or an external cron/worker.
4. **Idempotency** — `ai_image_jobs` keyed by `(product_id, source_fingerprint)` where `source_fingerprint = hash(sorted original_urls)`.
5. **Secrets** — `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` or IAM role on deploy target; never expose to client.
6. **Source image** — Bedrock needs bytes or a reachable URL; fetch `original_url` server-side (Supabase public URL), validate size (&lt; model limits, e.g. 5 MB Titan).

### Prompt strategy (sketch)

Build prompts from `title_en`, `category`, `tags`, `description_en`, and variant type:

- `closeup` — macro jewelry, shallow DOF, studio light  
- `model` — Indian woman, elegant saree/blouse, focus on jewelry, realistic  
- `lifestyle` — premium interior, gift context, bokeh  

Include negative prompts: wrong metal color, duplicated stones, distorted hands, text/watermarks.

---

## 5. Cloud API landscape — “unlimited free” (honest, 2025–2026)

### Short answer

**There is no reputable cloud API that offers unlimited, rate-limit-free, server-side image generation at production scale for a commercial catalog.** Anything marketed as “free unlimited” either:

- Shifts cost to **end users** (not suitable for a backend pipeline triggered by admin save), or  
- Is **browser-only / ToS-limited / queue-based**, or  
- Is a **short trial** then hard caps, or  
- Violates provider terms if scraped or abused.

### What research found

| Offering | Reality |
|----------|---------|
| **Puter.js** (“free unlimited”) | **User-pays** model: each visitor’s Puter account pays for usage. Fine for consumer apps in the browser; **not** a backend batch job after admin upload. |
| **Google Gemini / Imagen** | Official cookbook: **“Image generation is a paid-only feature”** on the free tier; requires billing. Imagen 3/4 billed per image. |
| **OpenAI DALL·E / GPT Image** | Paid API; rate limits and monthly spend caps. |
| **Stability, Fal, Replicate, etc.** | Credit-based; free tiers are small trials, not catalog scale. |
| **Hugging Face Inference** | Free tier heavily rate-limited; not for hundreds of SKUs × 5 images. |

**Conclusion for this project:** Plan on **metered cloud cost**. Default implementation path: **Amazon Bedrock** — user has **AWS credits** eligible for Bedrock (verify model access in console).

### Default plan: AWS Bedrock (credit-backed)

**Why Bedrock here**

- Same AWS account / credits as existing infrastructure intent  
- No GPU ops; enterprise IAM, logging (CloudTrail), regional control  
- Image models support **image conditioning / variation** (useful for “same necklace, new background”)  

**Model choice — A/B after implementation**

| | **Amazon Nova Canvas** | **Amazon Titan Image Generator v2** |
|--|-------------------------|-------------------------------------|
| Model ID (typical) | `amazon.nova-canvas-v1:0` | `amazon.titan-image-generator-v2:0` |
| Quality | Higher fidelity, richer controls (inpaint, color palette, up to 2048²) | Good baseline; subject consistency, background removal |
| Cost (us-east-1 order of magnitude) | ~**$0.04–0.08 / image** (std/premium, resolution-dependent) | ~**$0.008–0.012 / image** (std, resolution-dependent) |
| Best for | Hero lifestyle shots, marketing polish | Bulk variants, cost-sensitive iterations |
| EOL note | Check AWS model lifecycle (Nova/Titan generations have announced EOL windows — migrate when AWS deprecates) |

**Recommendation:** Implement a **provider interface**; ship **Titan v2** for cost smoke tests and **Nova Canvas** for quality A/B on 10–20 real SKUs; owner picks default.

**Regions:** Enable models in **one** region (e.g. `us-east-1`) and set `AWS_REGION` consistently. Request model access: Bedrock console → **Model access**.

---

## 6. Bedrock implementation notes

### Dependencies

```bash
npm install @aws-sdk/client-bedrock-runtime
```

### IAM (minimum)

Policy allowing `bedrock:InvokeModel` on chosen foundation model ARNs, e.g.:

- `arn:aws:bedrock:*::foundation-model/amazon.nova-canvas-v1:0`
- `arn:aws:bedrock:*::foundation-model/amazon.titan-image-generator-v2:0`

Use a dedicated IAM user or role for the deploy environment (Cloudflare Pages secrets / local `.env.local`).

### Approximate flow

1. **Job starts** with `product_id`, primary `original_url`, variant template id.  
2. **Fetch** source image: `fetch(original_url)` → `Buffer` / `Uint8Array`.  
3. **Build** Bedrock request body per [Nova Canvas](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova-canvas.html) or [Titan Image](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-image.html) docs (`taskType`: `TEXT_IMAGE`, `IMAGE_VARIATION`, or conditioning with base64 `inputImage`).  
4. **Invoke:**

```ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const response = await client.send(
  new InvokeModelCommand({
    modelId: process.env.BEDROCK_IMAGE_MODEL_ID!,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  })
);
// Parse JSON → base64 image field per model schema
```

5. **Decode** base64 → `Buffer`; upload to Supabase:

   `supabase.storage.from("product-images").upload(`ai/${productId}/${jobId}-${variant}.webp`, buffer, { contentType: "image/webp" })`

6. **DB:** Insert or update `product_images` row with `ai_generated_url` = public URL, `ai_status = 'pending'`.  
7. **Mark job** `completed` / `failed` with error message.

### ImageKit

After upload, storefront can keep using `ikImage(ai_generated_url, { width, format: "auto" })` same as originals once approved.

### Cloudflare caveat

If the worker cannot run Node Bedrock SDK, options: (a) **Supabase Edge Function** or **AWS Lambda** triggered by webhook/database, (b) small **Node** sidecar, (c) change only the AI route to `nodejs` on a host that supports it. Do not call Bedrock from the browser.

---

## 7. Non-goals & quality expectations

**Non-goals**

- Fully automated publish with zero human review  
- Guaranteed “model wearing exact SKU” without reference-image conditioning (manage expectations)  
- Unlimited free tier hunting as a blocker  
- Training custom LoRAs on device  

**Quality bar**

- **SKU fidelity:** Use image-to-image / variation with the uploaded photo as reference; compare thumbnails side-by-side in admin.  
- **Reject** images with wrong piece count, melted metal, extra limbs, or illegible branding.  
- **Telugu/English copy** on images: avoid generating text in images (prompt: “no text, no watermark”).  
- **Cultural sensitivity:** Model shots should match brand (elegant, not costume jewelry unless product is).  

---

## 8. Suggested implementation phases

### Phase 1 — MVP (backend only)

- Migration: `ai_image_jobs` + optional `ai_status` on `product_images`  
- Env: `AI_IMAGES_PER_PRODUCT`, Bedrock model id, AWS creds  
- On product `POST`/`PATCH`, enqueue job if images changed  
- Worker generates N images → writes `ai_generated_url`, status `pending`  
- Logging + admin API `GET /api/admin/products/[id]/ai-status`

### Phase 2 — Admin approval UI

- On `app/admin/(dashboard)/products/[id]/page.tsx`: grid of pending AI images, Approve / Reject / Regenerate one  
- Approved images toggle “Show on storefront” (or merge into gallery order)

### Phase 3 — Storefront gallery

- `ProductGallery.tsx`: show approved AI images (thumbnails); optional “Studio / Lifestyle” tabs  
- Fallback always to `original_url` if no approved AI  

### Phase 4 — Polish

- Per-category prompt packs (bangles vs silver articles)  
- Cost dashboard (images × price per model)  
- Retry failed variants only  

---

## 9. Key environment variables (placeholders)

Add to `.env.example` when implementing:

```bash
# AI image generation
AI_IMAGES_PER_PRODUCT=5
AI_GENERATION_ENABLED=true
AI_MAX_RETRIES=2

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
# Optional if using session token / SSO
# AWS_SESSION_TOKEN=
BEDROCK_IMAGE_MODEL_ID=amazon.titan-image-generator-v2:0
# BEDROCK_IMAGE_MODEL_ID=amazon.nova-canvas-v1:0

# Optional: separate bucket prefix or feature flags
AI_STORAGE_PREFIX=ai
```

Existing vars still required for pipeline I/O:

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`  
- `NEXT_PUBLIC_IMAGEKIT_URL` (and keys if using upload API)  

---

## 10. Official AWS links

| Resource | URL |
|----------|-----|
| Amazon Bedrock pricing | https://aws.amazon.com/bedrock/pricing/ |
| Bedrock User Guide (image models) | https://docs.aws.amazon.com/bedrock/latest/userguide/ |
| Titan Image Generator | https://docs.aws.amazon.com/bedrock/latest/userguide/titan-image-models.html |
| Nova Canvas | https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova-canvas.html |
| InvokeModel API | https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html |
| Model access (console) | https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html |
| Amazon Nova pricing overview | https://aws.amazon.com/nova/pricing/ |
| AWS SDK Bedrock Runtime (JS v3) | https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-runtime/ |

---

## Commands (repo)

```bash
npm install
npm run dev          # http://localhost:3000 — admin at /admin
npm run typecheck
npm run admin:create -- email@example.com 'password'
```

---

## Agent checklist (start here)

1. Read `components/admin/ImageUploader.tsx`, `app/api/admin/upload-image/route.ts`, `components/admin/ProductForm.tsx`, product API routes.  
2. Add schema for jobs + approval status.  
3. Implement Bedrock provider behind `lib/ai/bedrock-image.ts` (or similar).  
4. Wire enqueue on product save; **do not** block edge upload route.  
5. Build admin approval UI before changing `ProductGallery` behavior.  
6. Document actual per-image cost from AWS Cost Explorer after A/B.
