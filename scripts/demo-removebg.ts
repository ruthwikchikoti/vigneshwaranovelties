/**
 * Demo: take a REAL product photo from Supabase and run Bedrock Remove
 * Background on it, saving input + output locally so we can eyeball fidelity.
 *   npx tsx --env-file=.env.local scripts/demo-removebg.ts [productId]
 */
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import { writeFile } from "node:fs/promises";

const region = process.env.AWS_REGION || "us-west-2";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getSourceUrl(productId?: string): Promise<string> {
  let q = supabase
    .from("product_images")
    .select("original_url, product_id, ai_status")
    .eq("ai_status", "none")
    .limit(1);
  if (productId) q = supabase
    .from("product_images")
    .select("original_url, product_id, ai_status")
    .eq("product_id", productId)
    .eq("ai_status", "none")
    .limit(1);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) throw new Error("No original product images found in DB");
  return data[0].original_url as string;
}

async function removeBackground(client: AwsClient, modelId: string, b64: string) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(
    modelId
  )}/invoke`;
  return client.fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ image: b64, output_format: "png" }),
  });
}

async function main() {
  const productId = process.argv[2];
  const sourceUrl = await getSourceUrl(productId);
  console.log("→ source:", sourceUrl);

  const srcRes = await fetch(sourceUrl);
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  await writeFile("removebg-input.webp", srcBuf);
  const b64 = srcBuf.toString("base64");

  const client = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region,
    service: "bedrock",
  });

  // Try the plain model id, then the US cross-region inference profile.
  const candidates = [
    "stability.stable-image-remove-background-v1:0",
    "us.stability.stable-image-remove-background-v1:0",
  ];
  for (const modelId of candidates) {
    const t = Date.now();
    const res = await removeBackground(client, modelId, b64);
    if (!res.ok) {
      console.warn(`✗ ${modelId} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const json = (await res.json()) as { images?: string[] };
    const out = json.images?.[0];
    if (!out) {
      console.warn(`✗ ${modelId} → no image`);
      continue;
    }
    await writeFile("removebg-output.png", Buffer.from(out, "base64"));
    console.log(
      `✓ PASS  ${modelId} in ${Date.now() - t}ms → removebg-output.png ` +
        `(${Math.round((out.length * 3) / 4 / 1024)}KB transparent PNG)`
    );
    return;
  }
  throw new Error("All remove-background model ids failed");
}

main().catch((e) => {
  console.error("✗ FAIL", e?.message ?? e);
  process.exit(1);
});
