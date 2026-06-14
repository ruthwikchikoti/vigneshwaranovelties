/**
 * The shot list for the AI Studio. Every shot is a single OpenAI image-edit:
 * the owner's uploaded photo + the shot's `instruction` → a new look of the
 * SAME piece (input_fidelity=high keeps the exact stones/metal).
 *
 * No plain "studio" backdrops — the owner wants close-up angles, lifestyle
 * scenes and the piece worn on a model. Each instruction is appended to a
 * product-derived subject line and a shared fidelity clause (see
 * buildInstruction). Shots flagged `experimental` (the on-model ones) are the
 * hardest cases — badged in the review grid and pending until approved.
 */

export type Shot = {
  id: string;
  label: string;
  /** Scene/styling instruction appended to the product subject + fidelity clause. */
  instruction: string;
  /** Per-shot OpenAI quality override ("low" | "medium" | "high"). Cost scales
   *  steeply with quality; on-model shots earn the top tier, the rest "medium".
   *  Falls back to AiConfig.openaiQuality. */
  quality?: "low" | "medium" | "high";
  /** Low-confidence shot (model wearing the piece) — badged for review. */
  experimental?: boolean;
};

export const SHOTS: Shot[] = [
  {
    id: "macro_detail",
    label: "Macro detail",
    quality: "medium",
    instruction:
      "Re-photograph it as an extreme macro close-up that fills the frame, shallow depth of field, crisp focus on the stones and metal texture, soft directional light, blurred neutral background.",
  },
  {
    id: "golden_angle",
    label: "Golden angle",
    quality: "medium",
    instruction:
      "Re-photograph it as a three-quarter angled hero on a dark reflective surface with a warm golden key light and soft bokeh, luxury advertising photograph.",
  },
  {
    id: "marble_lifestyle",
    label: "Marble lifestyle",
    quality: "medium",
    instruction:
      "Re-photograph it resting on a polished white marble surface with soft natural daylight and a gentle shadow, premium lifestyle catalogue still life.",
  },
  {
    id: "model_wear",
    label: "On model",
    experimental: true,
    quality: "high", // hardest shot — worth the top tier
    instruction:
      "Show an elegant Indian woman wearing this exact jewellery set, soft-lit studio portrait framed from the collarbone up, tasteful saree or blouse neckline, sharp focus on the jewellery, realistic skin and fabric.",
  },
  {
    id: "model_closeup",
    label: "On model — close",
    experimental: true,
    quality: "high",
    instruction:
      "Extreme close-up of an elegant Indian woman's neckline wearing this exact necklace, the pendant and stones in sharp focus, warm flattering light and softly blurred background, editorial jewellery photograph.",
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
