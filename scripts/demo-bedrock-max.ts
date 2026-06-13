/**
 * Probe the MAX creative capability on Bedrock: Stable Image Control Structure.
 * Generates on-model / lifestyle shots that follow the piece's structure.
 *   npx tsx --env-file=.env.local scripts/demo-bedrock-max.ts
 */
import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import { writeFile } from "node:fs/promises";

const region = process.env.AWS_REGION || "us-west-2";
const MODEL = "us.stability.stable-image-control-structure-v1:0";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TESTS = [
  {
    name: "on-model",
    control: 0.5,
    prompt:
      "professional editorial photograph of an elegant Indian woman wearing an ornate gold necklace set with green emerald teardrop pendants and matching earrings, soft studio beauty lighting, plain neutral backdrop, focus on the jewellery, photorealistic, high fashion",
  },
  {
    name: "lifestyle-angle",
    control: 0.7,
    prompt:
      "luxury jewellery product photograph, ornate gold necklace with green emerald pendants on a polished marble surface, three-quarter angle, soft golden light, premium catalog, photorealistic",
  },
];

async function main() {
  const { data } = await supabase
    .from("product_images")
    .select("original_url")
    .eq("ai_status", "none")
    .limit(1);
  const url = data?.[0]?.original_url;
  if (!url) throw new Error("no source image");
  console.log("→ source:", url);
  const b64 = Buffer.from(await (await fetch(url)).arrayBuffer()).toString("base64");

  const client = new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region,
    service: "bedrock",
  });
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(
    MODEL
  )}/invoke`;

  for (const t of TESTS) {
    const started = Date.now();
    const res = await client.fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        image: b64,
        prompt: t.prompt,
        negative_prompt: "deformed, distorted, extra limbs, text, watermark, low quality",
        control_strength: t.control,
        output_format: "png",
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${t.name} HTTP ${res.status}:`, (await res.text()).slice(0, 300));
      continue;
    }
    const json = (await res.json()) as { images?: string[]; finish_reasons?: (string | null)[] };
    if (json.finish_reasons?.[0]) {
      console.error(`✗ ${t.name} blocked:`, json.finish_reasons[0]);
      continue;
    }
    const out = json.images?.[0];
    if (!out) {
      console.error(`✗ ${t.name} no image`);
      continue;
    }
    await writeFile(`max-${t.name}.png`, Buffer.from(out, "base64"));
    console.log(`✓ ${t.name} (control ${t.control}) in ${Date.now() - started}ms → max-${t.name}.png`);
  }
}

main().catch((e) => {
  console.error("✗ FAIL", e?.message ?? e);
  process.exit(1);
});
