import "server-only";
import { AwsClient } from "aws4fetch";
import { aiConfig } from "./config";
import { bytesToBase64 } from "./bytes";
import { ikImage } from "@/lib/imagekit";

/**
 * Image → product description, using a multimodal Bedrock model (Amazon Nova
 * Lite by default) over the Bedrock **Converse** API.
 *
 * Why Converse (not InvokeModel): its request/response shape is identical across
 * Nova, Claude and Llama-Vision, so swapping BEDROCK_TEXT_MODEL_ID is the only
 * change needed to move providers (e.g. if AWS credits run out).
 *
 * Cost: Nova Lite is the cheapest multimodal tier (~$0.0001 per call here), so
 * for an owner with AWS credits this is effectively zero out-of-pocket. The
 * Telugu side is handled separately by the free MyMemory translator
 * (lib/translate.ts) — this module only produces the English draft.
 *
 * Auth is AWS keys via SigV4 (aws4fetch), same as bedrock.ts (image pipeline).
 */

const MAX_IMAGES = 3; // use the angles the owner uploaded (cover + a couple more)
const MAX_BYTES = 4_000_000; // skip oversized sources rather than fail the call
// Downscale before sending to the model — a ~640px copy is plenty to identify the
// piece and is dramatically faster to fetch, base64-encode and tokenize than the
// full upload. This is the main speed lever for multi-image generation.
const MODEL_IMAGE_WIDTH = 640;

type ContentBlock =
  | { image: { format: string; source: { bytes: string } } }
  | { text: string };

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

/** Converse `image.format` accepts only these — map from the source mime type. */
function formatFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpeg";
}

async function loadImage(url: string): Promise<ContentBlock | null> {
  try {
    // Pull a downscaled copy via ImageKit (falls back to the original URL if
    // ImageKit isn't configured). Far smaller = far faster end-to-end.
    const small = ikImage(url, { width: MODEL_IMAGE_WIDTH, quality: 70 }) || url;
    const res = await fetch(small);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return null;
    const format = formatFromMime(res.headers.get("content-type") ?? "");
    return { image: { format, source: { bytes: bytesToBase64(bytes) } } };
  } catch {
    return null;
  }
}

// Tone + hard guardrails. The fidelity rules mirror the image pipeline: never
// claim things the photo can't prove (purity, weight, price, real vs imitation).
const SYSTEM_PROMPT =
  "You write catalogue listings for an Indian jewellery and gift showroom " +
  "(Vigneshwara Novelties, Cherial). Look ONLY at what is visibly in the photo.\n" +
  "Return ONLY a JSON object (no markdown, no code fences) with exactly these keys:\n" +
  '  "title": a short product name, 3 to 5 words, Title Case, no price, no trailing punctuation.\n' +
  '  "description": ONE short sentence (two at most, under 30 words total), plain text, warm but honest.\n' +
  '  "tags": an array of 3 to 5 short lowercase keywords (piece type, colour/finish, occasion).\n' +
  "HARD RULES:\n" +
  "- English only.\n" +
  "- NEVER invent facts you cannot see: no gold purity/karat, gram weight, price, gemstone " +
  "authenticity (real vs imitation/American diamond), or brand.\n" +
  "- If unsure of the metal, describe the look (e.g. 'gold-toned', 'silver-toned') instead of claiming it.\n" +
  "- Output must be valid JSON and nothing else.";

export type DescribeResult = { title: string; description: string; tags: string[] };

/** Parse the model's reply into a structured result, tolerating code fences and
 *  stray prose. Falls back to treating the whole reply as the description so the
 *  feature still works if the model ignores the JSON instruction. */
function parseResult(raw: string): DescribeResult {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(s.slice(start, end + 1)) as {
        title?: unknown;
        description?: unknown;
        tags?: unknown;
      };
      const tags = Array.isArray(obj.tags)
        ? obj.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 6)
        : [];
      return {
        title: typeof obj.title === "string" ? obj.title.trim() : "",
        description: typeof obj.description === "string" ? obj.description.trim() : "",
        tags,
      };
    } catch {
      // fall through to the prose fallback
    }
  }
  return { title: "", description: raw.trim(), tags: [] };
}

/**
 * From one or more uploaded photos, draft a product title, description and tags.
 * Throws on no usable image / Bedrock error so the route can fall back cleanly.
 */
export async function describeImages(opts: {
  imageUrls: string[];
  title?: string;
  category?: string;
  tags?: string[];
}): Promise<DescribeResult> {
  const cfg = aiConfig();

  const urls = opts.imageUrls.filter(Boolean).slice(0, MAX_IMAGES);
  const blocks = (await Promise.all(urls.map(loadImage))).filter(
    (b): b is ContentBlock => b !== null,
  );
  if (!blocks.length) throw new Error("no usable source image");

  const hints = [
    opts.title ? `Product name: ${opts.title}` : "",
    opts.category ? `Category: ${opts.category}` : "",
    opts.tags?.length ? `Tags: ${opts.tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const content: ContentBlock[] = [
    ...blocks,
    { text: `${hints ? hints + "\n\n" : ""}Return the JSON listing for this piece.` },
  ];

  const body = {
    messages: [{ role: "user", content }],
    system: [{ text: SYSTEM_PROMPT }],
    inferenceConfig: { maxTokens: 220, temperature: 0.6, topP: 0.9 },
  };

  const endpoint = `https://bedrock-runtime.${cfg.region}.amazonaws.com/model/${encodeURIComponent(
    cfg.textModelId,
  )}/converse`;

  const res = await bedrockClient().fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Bedrock ${res.status}: ${detail.slice(0, 300) || res.statusText}`);
  }

  const json = (await res.json()) as {
    output?: { message?: { content?: { text?: string }[] } };
  };
  const text = (json.output?.message?.content ?? [])
    .map((c) => c.text)
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!text) throw new Error("model returned no text");
  return parseResult(text);
}
