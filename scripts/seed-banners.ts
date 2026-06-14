/**
 * Seed homepage banners (hero + promos) and generate desktop + mobile images
 * via Bedrock text-to-image. Idempotent: matches existing banners by title.
 *
 *   npx tsx scripts/seed-banners.ts
 */
import { readFileSync } from "node:fs";
import { AwsClient } from "aws4fetch";

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

const client = new AwsClient({
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region,
  service: "bedrock",
});

const BANNERS = [
  {
    title: "Festive Gold Edit",
    position: "hero",
    badge_text: "NEW ARRIVALS",
    link_url: "/shop",
    scene:
      "opulent Indian gold necklaces, bangles and gemstone earrings in a festive arrangement, rich warm tones, soft diyas glow",
  },
  {
    title: "1 Gram Gold",
    position: "promo",
    badge_text: null,
    link_url: "/category/1-gram-gold",
    scene: "an elegant 1-gram-gold necklace and earring set, warm gold tones, premium",
  },
  {
    title: "Temple Jewellery",
    position: "promo",
    badge_text: null,
    link_url: "/category/pancha-loham-jewellery",
    scene: "traditional pancha-loham temple jewellery, antique gold, regal and ornate",
  },
];

async function textToImage(scene: string, aspect: string): Promise<Buffer> {
  const prompt =
    `Luxury Indian jewellery boutique banner: ${scene}, artfully arranged with generous ` +
    `empty negative space on one side for a headline, cinematic premium lighting, ` +
    `professional advertising photograph, no text, no watermark, no logo.`;
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;
  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ mode: "text-to-image", prompt, aspect_ratio: aspect, output_format: "png", seed: 11 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bedrock ${res.status}: ${text.slice(0, 160)}`);
  const b64 = (JSON.parse(text) as { images?: string[] }).images?.[0];
  if (!b64) throw new Error("no image");
  return Buffer.from(b64, "base64");
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

async function main() {
  // Tidy: fix the legacy lowercase category name.
  await sb("categories?slug=eq.1-gram-gold", { method: "PATCH", body: JSON.stringify({ name_en: "1 Gram Gold" }) });

  const existing = (await (await sb("banners?select=id,title")).json()) as { id: string; title: string }[];
  const byTitle = new Map((Array.isArray(existing) ? existing : []).map((b) => [b.title, b.id]));

  let order = 0;
  for (const b of BANNERS) {
    let id = byTitle.get(b.title);
    if (!id) {
      const res = await sb("banners", {
        method: "POST",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          title: b.title,
          position: b.position,
          badge_text: b.badge_text,
          link_url: b.link_url,
          sort_order: order,
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error(`insert banner ${b.title} failed ${res.status}: ${(await res.text()).slice(0, 160)}`);
      id = (await res.json())[0].id as string;
    }
    const desktop = await upload(`ai/banners/${id}-desktop.png`, await textToImage(b.scene, "16:9"));
    const mobile = await upload(`ai/banners/${id}-mobile.png`, await textToImage(b.scene, "4:5"));
    await sb(`banners?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ desktop_image_url: desktop, mobile_image_url: mobile }),
    });
    console.log(`✅ ${b.position} banner "${b.title}" (desktop + mobile)`);
    order++;
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
