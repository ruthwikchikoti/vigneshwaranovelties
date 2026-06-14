/**
 * Seed the shop's category tree (parents + sub-categories) and generate a cover
 * image for each via Bedrock text-to-image. Idempotent: matches existing rows by
 * slug, so re-running won't duplicate. Run once:
 *
 *   npx tsx scripts/seed-categories.ts            # create rows + generate covers
 *   npx tsx scripts/seed-categories.ts --no-image # rows only (skip generation)
 */
import { readFileSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const SKIP_IMAGES = process.argv.includes("--no-image");

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
const region = env.AWS_REGION || "us-west-2";
const model = env.BEDROCK_IMAGE_MODEL_ID || "stability.sd3-5-large-v1:0";
const BUCKET = "product-images";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// name → a richer art-direction phrase for the cover prompt.
const SCENE: Record<string, string> = {
  "1 Gram Gold": "traditional 1-gram-gold Indian necklace and earring set",
  Earrings: "elegant Indian gold earrings (jhumkas and studs)",
  Necklaces: "ornate Indian gold necklaces",
  Bracelets: "delicate gold bracelets",
  Rings: "fine gold rings with gemstones",
  Lockets: "gold locket pendants on chains",
  "Gift Items": "premium silver gift articles and decorative pieces",
  "Imitation Jewellery": "fashionable imitation jewellery set",
  "Pancha Loham Jewellery": "traditional pancha-loham (five-metal) temple jewellery",
  Anklets: "traditional silver anklets (payal) as a pair",
  "CZ Jewellery": "sparkling cubic-zirconia (CZ) jewellery set",
  "Saree Pins": "elegant decorative saree pins and brooches",
  Beads: "colourful decorative beads arranged for jewellery making",
  Brooches: "ornate decorative brooches for beadwork",
};

const TREE: { name: string; children?: string[] }[] = [
  { name: "1 Gram Gold", children: ["Earrings", "Necklaces", "Bracelets", "Rings", "Lockets"] },
  { name: "Gift Items" },
  { name: "Imitation Jewellery" },
  { name: "Pancha Loham Jewellery", children: ["Anklets"] },
  { name: "CZ Jewellery" },
  { name: "Saree Pins" },
  { name: "Beads" },
  { name: "Brooches" },
];

const client = new AwsClient({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region,
  service: "bedrock",
});

async function textToImage(name: string): Promise<Buffer> {
  const scene = SCENE[name] ?? `fine Indian ${name.toLowerCase()}`;
  const prompt =
    `Elegant e-commerce category cover: a tasteful arrangement of ${scene} on a soft warm ` +
    `luxury backdrop, premium jewellery boutique catalogue, professional studio lighting, ` +
    `true-to-life gold tone, no text, no watermark, no logo.`;
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ mode: "text-to-image", prompt, aspect_ratio: "1:1", output_format: "png", seed: 7 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${text.slice(0, 160)}`);
  const b64 = (JSON.parse(text) as { images?: string[] }).images?.[0];
  if (!b64) throw new Error("no image");
  return Buffer.from(b64, "base64");
}

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

const bySlug = new Map<string, string>();

async function ensureCategory(name: string, sortOrder: number, parentId: string | null): Promise<string> {
  const slug = slugify(name);
  if (bySlug.has(slug)) {
    const id = bySlug.get(slug)!;
    if (parentId) await sb(`categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ parent_id: parentId }) });
    return id;
  }
  const res = await sb("categories", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ slug, name_en: name, sort_order: sortOrder, is_active: true, parent_id: parentId }),
  });
  if (!res.ok) throw new Error(`insert ${name} failed ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const id = (await res.json())[0].id as string;
  bySlug.set(slug, id);
  return id;
}

async function setCover(id: string, name: string) {
  if (SKIP_IMAGES) return;
  const png = await textToImage(name);
  const path = `ai/categories/${id}.png`;
  const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "image/png", "x-upsert": "true" },
    body: png,
  });
  if (!up.ok) throw new Error(`upload ${name} failed ${up.status}`);
  const url = `${SB}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;
  await sb(`categories?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ image_url: url }) });
}

async function main() {
  const existing = (await (await sb("categories?select=id,slug")).json()) as { id: string; slug: string }[];
  if (!Array.isArray(existing)) throw new Error(`categories query failed: ${JSON.stringify(existing).slice(0, 160)}`);
  existing.forEach((c) => bySlug.set(c.slug, c.id));
  console.log(`Existing categories: ${existing.length}. Mode: ${SKIP_IMAGES ? "rows only" : "rows + covers"}\n`);

  let order = 0;
  for (const top of TREE) {
    const id = await ensureCategory(top.name, order++, null);
    await setCover(id, top.name);
    console.log(`✅ ${top.name}`);
    let childOrder = 0;
    for (const child of top.children ?? []) {
      const cid = await ensureCategory(child, childOrder++, id);
      await setCover(cid, child);
      console.log(`   └─ ${child}`);
    }
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
