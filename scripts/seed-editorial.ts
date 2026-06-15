/**
 * Generate the homepage "Editorial" image (home_editorial setting) and the
 * About page image (cms_pages "about") via OpenAI, upload, and set them.
 *   npx tsx scripts/seed-editorial.ts
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
const OPENAI = env.OPENAI_API_KEY;
const BUCKET = "product-images";

async function gen(prompt: string, size: string): Promise<Buffer> {
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
async function upload(path: string, png: Buffer): Promise<string> {
  const up = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "image/png", "x-upsert": "true" },
    body: png,
  });
  if (!up.ok) throw new Error(`upload failed ${up.status}`);
  return `${SB}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`;
}
async function sb(path: string, init?: RequestInit) {
  return fetch(`${SB}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

async function main() {
  if (!OPENAI) throw new Error("OPENAI_API_KEY missing");

  // 1) Homepage editorial (portrait 4:5).
  const homePrompt =
    "Warm, inviting Indian family jewellery boutique scene: an elegant display of gold " +
    "necklaces and bangles softly lit by daylight, refined premium lifestyle editorial " +
    "photograph, cream and gold tones, shallow depth of field, no text, no watermark.";
  const homeUrl = await upload("ai/editorial/home.png", await gen(homePrompt, "1024x1536"));
  const up = await sb("settings?on_conflict=key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: "home_editorial", value: { image_url: homeUrl } }),
  });
  console.log(up.ok ? "✅ home_editorial set" : `❌ home_editorial: ${up.status} ${(await up.text()).slice(0, 140)}`);

  // 2) About page image (landscape) — only if an "about" cms row exists.
  const rows = (await (await sb("cms_pages?select=id,slug,image_url&slug=eq.about")).json()) as
    | { id: string }[]
    | { message?: string };
  if (Array.isArray(rows) && rows[0]) {
    const aboutPrompt =
      "A welcoming Indian jewellery family showroom storefront and interior, warm ambient " +
      "lighting, tasteful gold jewellery displays, premium editorial lifestyle photograph, " +
      "inviting and trustworthy, no text, no watermark.";
    const aboutUrl = await upload("ai/editorial/about.png", await gen(aboutPrompt, "1536x1024"));
    const patch = await sb(`cms_pages?id=eq.${rows[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ image_url: aboutUrl }),
    });
    console.log(patch.ok ? "✅ about cms image set" : `❌ about: ${patch.status} ${(await patch.text()).slice(0, 140)}`);
  } else {
    console.log("ℹ️ no 'about' cms_pages row — skipped about image (create the About page in admin first)");
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
