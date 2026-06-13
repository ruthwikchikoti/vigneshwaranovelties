import "server-only";
import { AwsClient } from "aws4fetch";
import { aiConfig } from "./config";
import { base64ToBytes, bytesToBase64 } from "./bytes";

/**
 * Amazon Bedrock — Stability "Remove Background" image service, called via
 * aws4fetch (SigV4 over fetch + WebCrypto). It isolates the product from its
 * background with no re-imagining, so the exact piece is preserved. Note the
 * model is a cross-region inference profile (us.stability.*) — it must be
 * invoked by its profile id, not the bare on-demand model id.
 */

const MAX_SOURCE_BYTES = 9_000_000; // remove-bg cap is ~9.4M pixels; keep bytes sane

function bedrockClient() {
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

/** Download a source image and return its bytes, validating the size cap. */
export async function fetchSourceImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`source fetch failed (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("source image is empty");
  if (buf.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`source image too large (${Math.round(buf.byteLength / 1024)}KB)`);
  }
  return buf;
}

type RemoveBgResponse = {
  images?: string[];
  finish_reasons?: (string | null)[];
};

/** Remove the background from a product photo → transparent PNG bytes. */
export async function removeBackground(sourceImage: Uint8Array): Promise<Uint8Array> {
  const cfg = aiConfig();
  const client = bedrockClient();
  const endpoint = `https://bedrock-runtime.${cfg.region}.amazonaws.com/model/${encodeURIComponent(
    cfg.removeBgModelId
  )}/invoke`;

  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ image: bytesToBase64(sourceImage), output_format: "png" }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bedrock ${res.status}: ${detail.slice(0, 400) || res.statusText}`);
  }

  const json = (await res.json()) as RemoveBgResponse;
  const reason = json.finish_reasons?.[0];
  if (reason) throw new Error(`Remove-background failed: ${reason}`);
  const b64 = json.images?.[0];
  if (!b64) throw new Error("Bedrock returned no image");
  return base64ToBytes(b64);
}

type ControlStructureResponse = {
  images?: string[];
  finish_reasons?: (string | null)[];
};

/**
 * Stability "Control Structure" — re-renders a styled scene GUIDED BY the
 * source image's structure. A high control_strength keeps the generated piece
 * close to the uploaded one; a fixed seed makes the output deterministic so the
 * same product + shot always yields the same image (good for retries/caching).
 */
export async function controlStructure(
  sourceImage: Uint8Array,
  opts: { prompt: string; negativePrompt: string; controlStrength: number; seed: number }
): Promise<Uint8Array> {
  const cfg = aiConfig();
  const client = bedrockClient();
  const endpoint = `https://bedrock-runtime.${cfg.region}.amazonaws.com/model/${encodeURIComponent(
    cfg.controlModelId
  )}/invoke`;

  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      image: bytesToBase64(sourceImage),
      prompt: opts.prompt,
      negative_prompt: opts.negativePrompt,
      control_strength: opts.controlStrength,
      // Stability seeds must be in [0, 4294967294]; keep it positive and in range.
      seed: Math.abs(opts.seed) % 4294967294,
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
  return base64ToBytes(b64);
}
