/**
 * Generate category + banner imagery with Bedrock TEXT-TO-IMAGE (no source
 * photo needed — these are decorative). PREVIEW mode by default: writes PNGs to
 * /tmp so we can eyeball them before seeding. Pass `--seed` to also upload to
 * Supabase storage and update the category/banner rows.
 *
 *   npx tsx scripts/seed-ai-images.ts          # preview only → /tmp
 *   npx tsx scripts/seed-ai-images.ts --seed   # generate + write to DB
 */
import { readFileSync, writeFileSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const DO_SEED = process.argv.includes("--seed");

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv(".env.local");
const region = env.AWS_REGION || "us-west-2";
const model = env.BEDROCK_IMAGE_MODEL_ID || "stability.sd3-5-large-v1:0";
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";

const client = new AwsClient({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region,
  service: "bedrock",
});

const QUALITY =
  "Premium jewellery e-commerce photography, ultra sharp, true-to-life gold tone, " +
  "warm luxury styling, soft professional studio lighting, no text, no watermark, no logo.";

async function textToImage(prompt: string, aspect: string): Promise<Buffer> {
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      mode: "text-to-image",
      prompt: `${prompt} ${QUALITY}`,
      aspect_ratio: aspect,
      output_format: "png",
      seed: 7,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { images?: string[]; finish_reasons?: (string | null)[] };
  if (json.finish_reasons?.[0]) throw new Error(`blocked: ${json.finish_reasons[0]}`);
  const b64 = json.images?.[0];
  if (!b64) throw new Error("no image");
  return Buffer.from(b64, "base64");
}

async function sbGet(pathQ: string) {
  return fetch(`${SB}/rest/v1/${pathQ}`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  }).then((r) => r.json());
}

async function uploadAndPublicUrl(path: string, bytes: Buffer): Promise<string> {
  const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "image/png", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) throw new Error(`upload failed ${up.status}: ${(await up.text()).slice(0, 150)}`);
  return `${SB}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;
}

async function sbPatch(table: string, id: string, body: Record<string, unknown>) {
  const res = await fetch(`${SB}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`patch ${table} failed ${res.status}: ${(await res.text()).slice(0, 150)}`);
}

async function main() {
  console.log(`Model ${model} · mode ${DO_SEED ? "SEED (writes DB)" : "PREVIEW (→ /tmp)"}\n`);

  const categories = (await sbGet("categories?select=id,slug,name_en&is_active=eq.true")) as
    | { id: string; slug: string; name_en: string }[]
    | { message?: string };
  if (!Array.isArray(categories)) throw new Error(`categories query: ${JSON.stringify(categories).slice(0, 200)}`);

  for (const c of categories) {
    const prompt = `Elegant category cover for "${c.name_en}": a tasteful arrangement of fine Indian ${c.name_en.toLowerCase()} on a soft warm luxury backdrop, high-end boutique catalogue.`;
    try {
      const png = await textToImage(prompt, "1:1");
      writeFileSync(`/tmp/cat-${c.slug}.png`, png);
      console.log(`✅ category ${c.name_en} → /tmp/cat-${c.slug}.png`);
      if (DO_SEED) {
        const url = await uploadAndPublicUrl(`ai/categories/${c.id}.png`, png);
        await sbPatch("categories", c.id, { image_url: url });
        console.log(`   seeded image_url`);
      }
    } catch (e) {
      console.log(`❌ category ${c.name_en}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const banners = (await sbGet("banners?select=id,title,position&is_active=eq.true")) as
    | { id: string; title: string; position: string }[]
    | { message?: string };
  if (!Array.isArray(banners)) {
    console.log(`(banners query: ${JSON.stringify(banners).slice(0, 150)})`);
  } else {
    for (const b of banners) {
      const prompt = `Luxury Indian jewellery ${b.position} banner — opulent gold necklaces, bangles and gemstone earrings artfully arranged with generous empty space on one side for a headline, warm festive premium ambience, cinematic.`;
      try {
        const desktop = await textToImage(prompt, "16:9");
        writeFileSync(`/tmp/banner-${b.id}.png`, desktop);
        console.log(`✅ banner "${b.title}" → /tmp/banner-${b.id}.png`);
        if (DO_SEED) {
          const dUrl = await uploadAndPublicUrl(`ai/banners/${b.id}-desktop.png`, desktop);
          const mobile = await textToImage(prompt, "4:5");
          const mUrl = await uploadAndPublicUrl(`ai/banners/${b.id}-mobile.png`, mobile);
          await sbPatch("banners", b.id, { desktop_image_url: dUrl, mobile_image_url: mUrl });
          console.log(`   seeded desktop + mobile`);
        }
      } catch (e) {
        console.log(`❌ banner ${b.title}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
