/**
 * Seed the full category tree (parents + sub-categories) AND homepage banners,
 * generating every image via OpenAI gpt-image-1 (Amazon/Myntra-grade tiles +
 * banners). Idempotent: matches categories by slug, banners by title, and only
 * generates an image when one is missing (so re-running is cheap/safe).
 *
 *   npx tsx scripts/seed-catalog.ts            # rows + images
 *   npx tsx scripts/seed-catalog.ts --rows     # rows only (no image spend)
 *   npx tsx scripts/seed-catalog.ts --force-img # regenerate all images
 */
import { readFileSync } from "node:fs";

const ROWS_ONLY = process.argv.includes("--rows");
const FORCE_IMG = process.argv.includes("--force-img");

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
const OPENAI = env.OPENAI_API_KEY;
const BUCKET = "product-images";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Parent slug overrides for clean URLs.
const SLUG: Record<string, string> = { "Men's": "mens" };
const pslug = (name: string) => SLUG[name] ?? slugify(name);

// Art direction per category name (what to actually show).
const SCENE: Record<string, string> = {
  "1 Gram Gold": "an elegant 1-gram-gold necklace and earring set with green and ruby stones",
  "CZ Jewellery": "a sparkling cubic-zirconia (American diamond) necklace set",
  "Panchaloha Jewellery": "a traditional panchaloha (impon, five-metal) temple necklace set",
  "Imitation Jewellery": "a fashionable gold-plated imitation jewellery set",
  "Men's": "men's gold jewellery — a thick kada bracelet and a chain",
  Beads: "an assortment of colourful glossy jewellery-making beads",
  "Gift Items": "elegant premium silver gift articles and decorative pieces",
  "Saree Pins": "a set of ornate decorative saree pins / brooches",
  // product types (subs) — phrased generically, combined with the parent below
  Haram: "a long traditional gold haram (long necklace)",
  Necklaces: "an ornate gold necklace",
  "Beaded Necklaces": "a colourful beaded necklace",
  Earrings: "a pair of elegant gold earrings (jhumkas)",
  Bangles: "a stack of ornate gold bangles",
  Vaddanam: "a traditional gold vaddanam (waist belt)",
  Chains: "a fine gold chain",
  Pendants: "a gold pendant on a chain",
  "Pendant Sets": "a gold pendant set with matching earrings",
  "Bridal Sets": "a grand bridal gold jewellery set",
  Rings: "fine gold rings with gemstones",
  Bracelets: "a delicate gold bracelet",
  "Beaded Bracelets": "a colourful beaded bracelet",
  Kada: "a pair of broad ornate gold kada bangles",
  Kadiyam: "a heavy men's gold kada bracelet (kadiyam)",
  Anklets: "a pair of silver anklets (payal)",
  "Loose Beads": "neatly arranged loose jewellery beads in many colours",
  Brooches: "ornate decorative brooches for beadwork",
};

const TREE: { name: string; children?: string[] }[] = [
  { name: "1 Gram Gold", children: ["Haram", "Necklaces", "Earrings", "Bangles", "Vaddanam", "Chains", "Pendants", "Bridal Sets"] },
  { name: "CZ Jewellery", children: ["Necklaces", "Earrings", "Bangles", "Rings", "Bracelets", "Pendant Sets"] },
  { name: "Panchaloha Jewellery", children: ["Haram", "Necklaces", "Earrings", "Bangles", "Kada"] },
  { name: "Imitation Jewellery", children: ["Necklaces", "Earrings", "Bangles", "Rings", "Bracelets", "Anklets"] },
  { name: "Men's", children: ["Kadiyam", "Chains", "Rings", "Bracelets"] },
  { name: "Beads", children: ["Beaded Necklaces", "Beaded Bracelets", "Loose Beads", "Brooches"] },
  { name: "Gift Items" },
  { name: "Saree Pins" },
];

const BANNERS = [
  { title: "Festive Gold Edit", position: "hero", badge_text: "NEW ARRIVALS", link_url: "/shop",
    scene: "opulent gold necklaces, bangles and gemstone earrings with a glowing diya" },
  { title: "1 Gram Gold", position: "promo", badge_text: null, link_url: "/category/1-gram-gold",
    scene: "an elegant 1-gram-gold long necklace (haram) set" },
  { title: "Men's Collection", position: "promo", badge_text: null, link_url: "/category/mens",
    scene: "men's gold jewellery — a bold kada bracelet and a thick chain" },
];

async function openaiImage(prompt: string, size: string): Promise<Buffer> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size, quality: "medium", n: 1 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  const b64 = (JSON.parse(text) as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
  if (!b64) throw new Error("no image");
  return Buffer.from(b64, "base64");
}

function categoryPrompt(name: string, parent?: string): string {
  const subject = parent
    ? `${SCENE[name] ?? `fine ${name.toLowerCase()}`} (${parent} style)`
    : SCENE[name] ?? `fine Indian ${name.toLowerCase()}`;
  return (
    `Clean e-commerce category tile for an Indian jewellery store: ${subject}, ` +
    `centred on a soft cream gradient studio background, even professional lighting, ` +
    `crisp and true-to-life, minimal with generous clean space, premium catalogue look, ` +
    `no text, no watermark, no logo.`
  );
}

function bannerPrompt(scene: string): string {
  return (
    `Premium e-commerce hero banner for an Indian jewellery brand (Myntra/Amazon sale ` +
    `style): ${scene}, elegantly arranged on one side, warm festive gradient background ` +
    `with soft bokeh, generous clean empty space on the other side for a headline, ` +
    `polished advertising photography, high resolution, no text, no watermark, no logo.`
  );
}

async function sb(path: string, init?: RequestInit) {
  return fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}
async function upload(path: string, png: Buffer): Promise<string> {
  const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "image/png", "x-upsert": "true" },
    body: png,
  });
  if (!up.ok) throw new Error(`upload failed ${up.status}`);
  return `${SB}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;
}

type Cat = { id: string; slug: string; image_url: string | null };
const bySlug = new Map<string, Cat>();

async function ensureCat(name: string, slug: string, sortOrder: number, parentId: string | null): Promise<Cat> {
  const found = bySlug.get(slug);
  if (found) {
    if (parentId) await sb(`categories?id=eq.${found.id}`, { method: "PATCH", body: JSON.stringify({ parent_id: parentId }) });
    return found;
  }
  const res = await sb("categories", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ slug, name_en: name, sort_order: sortOrder, is_active: true, parent_id: parentId }),
  });
  if (!res.ok) throw new Error(`insert ${name}: ${res.status} ${(await res.text()).slice(0, 140)}`);
  const row = (await res.json())[0];
  const cat: Cat = { id: row.id, slug, image_url: row.image_url };
  bySlug.set(slug, cat);
  return cat;
}

async function catCover(cat: Cat, name: string, parent?: string) {
  if (ROWS_ONLY) return;
  if (cat.image_url && !FORCE_IMG) return;
  const png = await openaiImage(categoryPrompt(name, parent), "1024x1024");
  const url = await upload(`ai/categories/${cat.id}.png`, png);
  await sb(`categories?id=eq.${cat.id}`, { method: "PATCH", body: JSON.stringify({ image_url: url }) });
}

async function main() {
  if (!OPENAI && !ROWS_ONLY) throw new Error("OPENAI_API_KEY missing");
  const existing = (await (await sb("categories?select=id,slug,image_url")).json()) as Cat[];
  if (!Array.isArray(existing)) throw new Error(`categories query: ${JSON.stringify(existing).slice(0, 140)}`);
  existing.forEach((c) => bySlug.set(c.slug, c));
  console.log(`Start. ${existing.length} existing categories. Mode: ${ROWS_ONLY ? "rows only" : "rows + images"}\n`);

  let order = 0;
  for (const top of TREE) {
    const slug = pslug(top.name);
    const cat = await ensureCat(top.name, slug, order++, null);
    await catCover(cat, top.name);
    console.log(`✅ ${top.name}`);
    let ci = 0;
    for (const child of top.children ?? []) {
      const cslug = `${slug}-${slugify(child)}`;
      const sub = await ensureCat(child, cslug, ci++, cat.id);
      await catCover(sub, child, top.name);
      console.log(`   └─ ${child}`);
    }
  }

  // Banners
  const banners = (await (await sb("banners?select=id,title,desktop_image_url")).json()) as
    { id: string; title: string; desktop_image_url: string | null }[];
  const bTitle = new Map((Array.isArray(banners) ? banners : []).map((b) => [b.title, b]));
  let bo = 0;
  for (const b of BANNERS) {
    let row = bTitle.get(b.title);
    if (!row) {
      const res = await sb("banners", {
        method: "POST", headers: { prefer: "return=representation" },
        body: JSON.stringify({ title: b.title, position: b.position, badge_text: b.badge_text, link_url: b.link_url, sort_order: bo, is_active: true }),
      });
      if (!res.ok) throw new Error(`insert banner ${b.title}: ${res.status}`);
      row = (await res.json())[0];
    }
    if (!ROWS_ONLY && (FORCE_IMG || !row!.desktop_image_url)) {
      const desktop = await upload(`ai/banners/${row!.id}-desktop.png`, await openaiImage(bannerPrompt(b.scene), "1536x1024"));
      const mobile = await upload(`ai/banners/${row!.id}-mobile.png`, await openaiImage(bannerPrompt(b.scene), "1024x1536"));
      await sb(`banners?id=eq.${row!.id}`, { method: "PATCH", body: JSON.stringify({ desktop_image_url: desktop, mobile_image_url: mobile }) });
    }
    console.log(`✅ banner "${b.title}"`);
    bo++;
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
