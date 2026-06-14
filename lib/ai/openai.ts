import "server-only";
import { aiConfig } from "./config";
import { base64ToBytes } from "./bytes";

/**
 * OpenAI image generation via the **edits** endpoint (gpt-image-1). Given the
 * owner's uploaded photo + a text instruction, it re-shoots the SAME piece into
 * a new look (studio / lifestyle / on-model). It's a plain Bearer-token REST
 * call with a multipart body, so it runs on the edge runtime.
 *
 * Docs: https://platform.openai.com/docs/api-reference/images/createEdit
 */

const MAX_SOURCE_BYTES = 25_000_000; // gpt-image-1 edits accept up to ~25-50MB

/** Download a source image and return its bytes + mime, validating the size cap. */
export async function fetchSourceImage(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`source fetch failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("source image is empty");
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`source image too large (${Math.round(bytes.byteLength / 1024)}KB)`);
  }
  return { bytes, mime: sniffMime(bytes) };
}

/** Best-effort sniff of an image mime type from its magic bytes (defaults to PNG). */
function sniffMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45
  )
    return "image/webp";
  return "image/png";
}

function extFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

type EditResponse = {
  data?: { b64_json?: string }[];
  error?: { message?: string };
};

/** WebP output bytes from gpt-image-1. */
export type GeneratedImage = { bytes: Uint8Array; contentType: "image/webp"; ext: "webp" };

/**
 * Re-shoot the source image per `instruction` → generated WebP bytes.
 *
 * Cost/quality knobs: `opts.quality` (per-shot override) is the dominant cost
 * driver; `input_fidelity: high` preserves the exact piece; WebP + compression
 * shrink the stored file. Throws a trimmed error on HTTP failure or a missing
 * image so the generate route's retry loop can log and continue.
 */
export async function generateImage(
  source: { bytes: Uint8Array; mime: string },
  instruction: string,
  opts: { quality?: string } = {}
): Promise<GeneratedImage> {
  const cfg = aiConfig();
  if (!cfg.openaiApiKey) throw new Error("OpenAI API key not configured");

  const form = new FormData();
  form.append("model", cfg.openaiModel);
  form.append("prompt", instruction);
  form.append("n", "1");
  form.append("size", cfg.openaiSize);
  form.append("quality", opts.quality || cfg.openaiQuality);
  form.append("input_fidelity", cfg.openaiInputFidelity);
  form.append("output_format", "webp");
  form.append("output_compression", String(cfg.openaiCompression));
  form.append(
    "image",
    new Blob([source.bytes as unknown as BlobPart], { type: source.mime }),
    `source.${extFor(source.mime)}`
  );

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    // No content-type header: fetch sets the multipart boundary from FormData.
    headers: { authorization: `Bearer ${cfg.openaiApiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 400) || res.statusText}`);
  }

  const json = (await res.json()) as EditResponse;
  if (json.error?.message) throw new Error(`OpenAI error: ${json.error.message.slice(0, 200)}`);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image");
  return { bytes: base64ToBytes(b64), contentType: "image/webp", ext: "webp" };
}
