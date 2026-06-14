import "server-only";

/**
 * Central config for the AI image pipeline. All values come from env so the
 * owner can tune count / model / cost caps without a code change.
 *
 * Provider: AWS Bedrock (Stability). DEFAULT mode is image-to-image, which keeps
 * the uploaded photo's pixels and restyles by `strength` (low = faithful) so the
 * exact piece survives. Auth is AWS keys via SigV4 (aws4fetch) — see bedrock.ts.
 */
export type AiConfig = {
  enabled: boolean;
  imagesPerProduct: number;
  maxRetries: number;
  storagePrefix: string;
  region: string;
  /** Bedrock image model id (use the "us." prefix for inference profiles). */
  bedrockModelId: string;
  /** "image-to-image" (keeps pixels, DEFAULT) | "control-structure" (edges only). */
  bedrockMode: string;
  /** image-to-image 0..1 — LOWER = stay closer to the exact uploaded piece. */
  bedrockStrength: number;
  /** control-structure 0..1 — higher = follow the photo's structure more. */
  controlStrength: number;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
};

function intEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function floatEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

export function aiConfig(): AiConfig {
  return {
    // Default ON: the feature is opt-out, not opt-in. Generation still requires
    // a manual click in admin, so this only gates whether the UI is offered.
    enabled: process.env.AI_GENERATION_ENABLED !== "false",
    imagesPerProduct: intEnv("AI_IMAGES_PER_PRODUCT", 5, 1, 8),
    maxRetries: intEnv("AI_MAX_RETRIES", 2, 0, 5),
    storagePrefix: (process.env.AI_STORAGE_PREFIX || "ai").replace(/^\/+|\/+$/g, ""),
    region: process.env.AWS_REGION || "us-west-2",
    bedrockModelId:
      process.env.BEDROCK_IMAGE_MODEL_ID || "stability.sd3-5-large-v1:0",
    bedrockMode: process.env.BEDROCK_MODE || "image-to-image",
    bedrockStrength: floatEnv("BEDROCK_STRENGTH", 0.35, 0, 1),
    controlStrength: floatEnv("BEDROCK_CONTROL_STRENGTH", 0.8, 0, 1),
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

/**
 * True when real AWS Bedrock credentials are present. When false, the pipeline
 * runs in DEV MOCK mode — it produces placeholder images (the original photo
 * unchanged) so the whole enqueue → generate → review → publish flow can be
 * exercised with zero cost and no keys.
 */
export function aiConfigured(): boolean {
  const c = aiConfig();
  return Boolean(
    c.accessKeyId &&
      c.secretAccessKey &&
      !c.accessKeyId.includes("placeholder") &&
      !c.secretAccessKey.includes("placeholder")
  );
}
