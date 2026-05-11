/*
 * Idempotent Supabase Storage setup — creates the `product-images` bucket
 * (public-read) using the service role key. Run once after Supabase is set up:
 *
 *   npm run storage:setup
 *
 * The upload route also auto-creates the bucket on first upload, so this is
 * just for convenience / pre-flight.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, key, rawVal] = m;
      const val = rawVal.replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no env.local */
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || url.includes("placeholder")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BUCKET = "product-images";

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function listBuckets() {
  const res = await fetch(`${url}/storage/v1/bucket`, { headers });
  if (!res.ok) throw new Error(`listBuckets failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as Array<{ id: string; name: string }>;
}

async function createBucket() {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 10 * 1024 * 1024,
    }),
  });
  if (!res.ok) throw new Error(`createBucket failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`→ checking buckets in ${url}…`);
  const buckets = await listBuckets();
  const exists = buckets.some((b) => b.name === BUCKET);
  if (exists) {
    console.log(`✓ bucket "${BUCKET}" already exists.`);
    return;
  }
  console.log(`→ creating bucket "${BUCKET}" (public)…`);
  await createBucket();
  console.log(`✓ bucket "${BUCKET}" created.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
