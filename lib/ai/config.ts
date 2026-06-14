import "server-only";

/**
 * Central config for the AI image pipeline. All values come from env so the
 * owner can tune count / model / cost caps without a code change.
 *
 * The pipeline runs on OpenAI's image **edit** endpoint (gpt-image-1): it takes
 * the owner's uploaded photo + a text instruction and re-shoots the SAME piece
 * into a new look (studio / lifestyle / on-model). A plain Bearer-token REST
 * call that works on the edge runtime.
 */
export type AiConfig = {
  enabled: boolean;
  imagesPerProduct: number;
  maxRetries: number;
  storagePrefix: string;
  /** OpenAI image model id, e.g. "gpt-image-1". */
  openaiModel: string;
  /** Output size, e.g. "1024x1024" | "1024x1536" | "1536x1024" | "auto". */
  openaiSize: string;
  /** Default render quality / cost knob: "low" | "medium" | "high" | "auto".
   *  Per-shot overrides in lib/ai/presets.ts win over this. */
  openaiQuality: string;
  /** How hard to preserve the input photo's details: "high" keeps the exact
   *  piece (best for jewellery); "low" lets the model reinterpret more. */
  openaiInputFidelity: string;
  /** WebP output compression 1-100 (smaller files → faster storefront). */
  openaiCompression: number;
  /** OpenAI API key. Absent → dev mock mode. */
  openaiApiKey: string | undefined;
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
    openaiModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    openaiSize: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    openaiQuality: process.env.OPENAI_IMAGE_QUALITY || "medium",
    openaiInputFidelity: process.env.OPENAI_INPUT_FIDELITY || "high",
    openaiCompression: intEnv("OPENAI_OUTPUT_COMPRESSION", 80, 1, 100),
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

/**
 * True when a real OpenAI API key is present. When false, the pipeline runs in
 * DEV MOCK mode — it produces placeholder images (the original photo unchanged)
 * so the whole enqueue → generate → review → publish flow can be exercised with
 * zero cost and no key.
 */
export function aiConfigured(): boolean {
  const c = aiConfig();
  return Boolean(c.openaiApiKey && !c.openaiApiKey.includes("placeholder"));
}
