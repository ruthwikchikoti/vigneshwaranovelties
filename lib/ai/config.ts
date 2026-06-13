import "server-only";

/**
 * Central config for the AI image pipeline. All values come from env so the
 * owner can tune count / model / cost caps without a code change.
 */
export type AiConfig = {
  enabled: boolean;
  imagesPerProduct: number;
  maxRetries: number;
  storagePrefix: string;
  region: string;
  /** Stability Remove Background — a cross-region inference profile id. */
  removeBgModelId: string;
  /** Stability Control Structure — a cross-region inference profile id. */
  controlModelId: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  sessionToken: string | undefined;
};

function intEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
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
    removeBgModelId:
      process.env.BEDROCK_REMOVE_BG_MODEL_ID ||
      "us.stability.stable-image-remove-background-v1:0",
    controlModelId:
      process.env.BEDROCK_CONTROL_MODEL_ID ||
      "us.stability.stable-image-control-structure-v1:0",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

/**
 * True when real AWS Bedrock credentials are present. When false, the pipeline
 * runs in DEV MOCK mode — it produces placeholder images so the whole
 * enqueue → generate → review → publish flow can be exercised with zero cost.
 */
export function isBedrockConfigured(): boolean {
  const c = aiConfig();
  return Boolean(
    c.accessKeyId &&
      c.secretAccessKey &&
      !c.accessKeyId.includes("placeholder") &&
      !c.secretAccessKey.includes("placeholder")
  );
}
