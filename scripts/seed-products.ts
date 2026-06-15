/**
 * Seed a few sample products (linked to categories, reusing existing category
 * cover images as photos) so the admin grid / delete can be tested. Idempotent
 * by slug. Run:  npx tsx scripts/seed-products.ts
 */
import { readFileSync } from "node:fs";

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = loadEnv(".env.local");
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// product name → category slug to file it under + price + flags
const PRODUCTS = [
  { name: "Antique Lakshmi Haram", cat: "1-gram-gold-haram", price: 2499, sale: 1999, flags: { is_featured: true, has_sale_badge: true } },
  { name: "Green Stone Necklace Set", cat: "1-gram-gold-necklaces", price: 1799, flags: { is_new_arrival: true } },
  { name: "Bridal Choker Set", cat: "1-gram-gold-bridal-sets", price: 4499, flags: { is_featured: true } },
  { name: "CZ Solitaire Ring", cat: "cz-jewellery-rings", price: 899, flags: { is_trending: true } },
  { name: "Temple Jhumka Earrings", cat: "panchaloha-jewellery-earrings", price: 1299, flags: { is_trending: true } },
  { name: "Men's Gold Kada", cat: "mens-kadiyam", price: 3499, flags: { is_new_arrival: true } },
  { name: "Beaded Layered Necklace", cat: "beads-beaded-necklaces", price: 599, flags: {} },
  { name: "Silver Anklets Pair", cat: "imitation-jewellery-anklets", price: 799, sale: 699, flags: { has_sale_badge: true } },
];

async function sb(path: string, init?: RequestInit) {
  return fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

async function main() {
  const cats = (await (await sb("categories?select=id,slug,image_url")).json()) as
    { id: string; slug: string; image_url: string | null }[];
  if (!Array.isArray(cats)) throw new Error(`categories query failed: ${JSON.stringify(cats).slice(0, 140)}`);
  const bySlug = new Map(cats.map((c) => [c.slug, c]));

  const existing = (await (await sb("products?select=slug")).json()) as { slug: string }[];
  const haveSlugs = new Set((Array.isArray(existing) ? existing : []).map((p) => p.slug));

  let order = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    if (haveSlugs.has(slug)) {
      console.log(`• skip (exists): ${p.name}`);
      order++;
      continue;
    }
    const cat = bySlug.get(p.cat);
    if (!cat) {
      console.log(`❌ ${p.name}: category "${p.cat}" not found`);
      continue;
    }
    const res = await sb("products", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({
        slug,
        title_en: p.name,
        price_inr: p.price,
        discount_price_inr: p.sale ?? null,
        category_id: cat.id,
        stock_status: "in_stock",
        is_active: true,
        is_featured: false,
        is_trending: false,
        is_new_arrival: false,
        has_sale_badge: false,
        has_offer_badge: false,
        sort_order: order,
        ...p.flags,
      }),
    });
    if (!res.ok) {
      console.log(`❌ ${p.name}: ${res.status} ${(await res.text()).slice(0, 140)}`);
      continue;
    }
    const id = (await res.json())[0].id as string;
    // Reuse the category cover image as the product photo (for testing).
    if (cat.image_url) {
      await sb("product_images", {
        method: "POST",
        body: JSON.stringify({ product_id: id, original_url: cat.image_url, is_primary: true, sort_order: 0 }),
      });
    }
    console.log(`✅ ${p.name}  →  ${p.cat}`);
    order++;
  }
  const count = (await (await sb("products?select=id")).json()) as unknown[];
  console.log(`\nDone. Total products now: ${Array.isArray(count) ? count.length : "?"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
