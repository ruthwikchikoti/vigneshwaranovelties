import "server-only";
import { AwsClient } from "aws4fetch";
import { aiConfig } from "./config";
import { base64ToBytes, bytesToBase64 } from "./bytes";

/**
 * AWS Bedrock image provider. Keeps the current shot/prompt system but generates
 * via Stability "Control Structure": it re-renders a styled scene GUIDED BY the
 * uploaded photo's structure at a high control_strength, with a deterministic
 * seed so the same product + shot is reproducible. Called over aws4fetch (SigV4
 * over fetch + WebCrypto).
 *
 * Model is a cross-region inference profile (us.stability.*) — invoke it by its
 * profile id, not the bare on-demand model id.
 */

const MAX_SOURCE_BYTES = 9_000_000; // control-structure cap is ~9.4M pixels

function bedrockClient(): AwsClient {
  const cfg = aiConfig();
  if (!cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    sessionToken: cfg.sessionToken,
    region: cfg.region,
    service: "bedrock",
  });
}

/** Download a source image and return its bytes + mime, validating the size cap. */
export async function fetchSourceImage(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`source fetch failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("source image is empty");
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`source image too large (${Math.round(bytes.byteLength / 1024)}KB)`);
  }
  return { bytes, mime: "image/png" };
}

/** Deterministic seed from the prompt so retries/caching are stable. */
function seedFor(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h) % 4294967294;
}

const NEGATIVE_PROMPT =
  "plain metal, blank pendant, missing stones, removed gemstones, recoloured stones, " +
  "wrong colour, extra jewellery, duplicated pendant, text, watermark, logo, deformed, " +
  "distorted, low quality, blurry";

export type GeneratedImage = { bytes: Uint8Array; contentType: "image/png"; ext: "png" };

type ControlStructureResponse = {
  images?: string[];
  finish_reasons?: (string | null)[];
};

/**
 * Re-render the source per `prompt` → generated PNG bytes. Throws a trimmed
 * error on HTTP failure / safety block / missing image so the generate route's
 * retry loop can log and continue.
 */
export async function generateImage(
  source: { bytes: Uint8Array; mime: string },
  prompt: string
): Promise<GeneratedImage> {
  const cfg = aiConfig();
  const client = bedrockClient();
  const endpoint = `https://bedrock-runtime.${cfg.region}.amazonaws.com/model/${encodeURIComponent(
    cfg.bedrockModelId
  )}/invoke`;

  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      image: bytesToBase64(source.bytes),
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      control_strength: cfg.controlStrength,
      seed: seedFor(prompt),
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bedrock ${res.status}: ${detail.slice(0, 400) || res.statusText}`);
  }

  const json = (await res.json()) as ControlStructureResponse;
  const reason = json.finish_reasons?.[0];
  if (reason) throw new Error(`Image blocked: ${reason}`);
  const b64 = json.images?.[0];
  if (!b64) throw new Error("Bedrock returned no image");
  return { bytes: base64ToBytes(b64), contentType: "image/png", ext: "png" };
}
