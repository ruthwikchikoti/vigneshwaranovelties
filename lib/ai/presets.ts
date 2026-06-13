/**
 * The shot list for the AI Studio. Every shot is a single Google Gemini
 * image-edit: the owner's uploaded photo + the shot's `instruction` → a new look
 * of the SAME piece. One engine, no background-removal or compositing.
 *
 * Each instruction is appended to a product-derived subject line and a shared
 * fidelity clause (see buildInstruction) that tells Gemini to keep the jewellery
 * identical. Shots flagged `experimental` (currently the on-model portrait) are
 * the hardest cases — they're badged in the review grid and stay pending until
 * the owner approves them.
 */

export type Shot = {
  id: string;
  label: string;
  /** Scene/styling instruction appended to the product subject + fidelity clause. */
  instruction: string;
  /** Per-shot OpenAI quality override ("low" | "medium" | "high"). Cost scales
   *  steeply with quality, so plain studio shots run "low" and only the
   *  detail/scene-heavy ones pay for more. Falls back to AiConfig.openaiQuality. */
  quality?: "low" | "medium" | "high";
  /** Low-confidence shot (e.g. model wearing the piece) — badged for review. */
  experimental?: boolean;
};

export const SHOTS: Shot[] = [
  {
    id: "white_studio",
    label: "White studio",
    quality: "low", // plain backdrop — cheapest tier is plenty
    instruction:
      "Re-photograph it as a professional e-commerce product shot on a clean seamless white studio background, soft even lighting, a gentle natural contact shadow beneath the piece, centred composition.",
  },
  {
    id: "macro_detail",
    label: "Macro detail",
    quality: "medium", // detail matters, but input_fidelity carries the piece
    instruction:
      "Re-photograph it as an extreme macro close-up that fills the frame, shallow depth of field, crisp focus on the stones and metal texture, soft studio light on a neutral background.",
  },
  {
    id: "marble_lifestyle",
    label: "Marble lifestyle",
    quality: "medium",
    instruction:
      "Re-photograph it resting on a polished white marble surface with soft natural daylight and a gentle shadow, premium lifestyle catalogue still life.",
  },
  {
    id: "golden_angle",
    label: "Golden angle",
    quality: "medium",
    instruction:
      "Re-photograph it as a three-quarter angled hero on a dark reflective surface with a warm golden key light and soft bokeh, luxury advertising photograph.",
  },
  {
    id: "ivory_glow",
    label: "Ivory glow",
    quality: "low", // soft plain backdrop — cheapest tier is plenty
    instruction:
      "Re-photograph it on a warm ivory/cream backdrop with a soft glowing key light and a subtle reflection beneath, elegant boutique catalogue look.",
  },
  {
    id: "model_wear",
    label: "On model",
    experimental: true,
    quality: "high", // hardest shot — worth the top tier
    instruction:
      "Show an elegant Indian woman wearing this exact piece in a soft-lit studio portrait, tasteful saree or blouse neckline, focus on the jewellery, realistic skin and fabric.",
  },
];

/** Shared fidelity + cleanliness clause every shot inherits. */
const FIDELITY_CLAUSE =
  "Reproduce the EXACT piece from the photo — do not beautify, redesign, smooth, " +
  "restyle or upgrade the jewellery. Keep the same shape, every gemstone and its exact " +
  "colour, every diamond, the exact metal tone and the chain/pendant layout. Do not add, " +
  "remove, recolour or distort any stones. Change only the background, lighting and camera " +
  "angle. Photorealistic, premium catalogue quality, no text, no watermark.";

/**
 * Compose the full Gemini instruction for a shot from the product subject
 * (title / category / tags) + the shot styling + the shared fidelity clause.
 */
export function buildInstruction(shot: Shot, subject: string): string {
  const subjectLine = subject ? `This is a photograph of ${subject}. ` : "";
  return `${subjectLine}${shot.instruction} ${FIDELITY_CLAUSE}`;
}

/** Pick the first N shots (deterministic, aligned by index for retries). */
export function selectShots(count: number): Shot[] {
  const n = Math.max(1, Math.min(SHOTS.length, count));
  return SHOTS.slice(0, n);
}

export function shotLabel(id: string | null): string {
  return SHOTS.find((s) => s.id === id)?.label ?? id ?? "Variant";
}

/** True when the shot is an experimental/low-confidence look (badged in admin). */
export function shotExperimental(id: string | null): boolean {
  return Boolean(SHOTS.find((s) => s.id === id)?.experimental);
}
