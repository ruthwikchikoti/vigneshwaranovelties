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
  /** Per-shot OpenAI quality override ("low" | "medium" | "high"). All shots run
   *  "medium": with input_fidelity:high it stays sharp, costs less, and finishes
   *  inside the 60s function limit ("high" can take 60-90s and time out).
   *  Falls back to AiConfig.openaiQuality. */
  quality?: "low" | "medium" | "high";
  /** Low-confidence shot (model wearing the piece) — badged for review. */
  experimental?: boolean;
};

export const SHOTS: Shot[] = [
  {
    id: "macro_detail",
    label: "Macro detail",
    quality: "medium", // medium + input_fidelity:high stays sharp and finishes fast
    instruction:
      "Extreme macro hero close-up shot on a 100mm macro lens, the piece filling the frame at a slight three-quarter angle, shallow depth of field with every gemstone facet and the fine gold granulation tack-sharp, soft graduated neutral background, delicate catalogue reflection beneath.",
  },
  {
    id: "golden_angle",
    label: "Golden angle",
    quality: "medium",
    instruction:
      "Premium advertising hero on a dark glossy reflective surface, warm golden key light with soft elegant bokeh, the piece angled three-quarters to catch highlights along the metal.",
  },
  {
    id: "marble_lifestyle",
    label: "Marble lifestyle",
    quality: "medium",
    instruction:
      "Aspirational lifestyle still life on polished white-and-grey marble with soft natural window light and a delicate shadow, a couple of tasteful out-of-focus props (folded silk, a single bloom) at the very edge of frame, top jewellery-brand catalogue styling.",
  },
  {
    id: "model_wear",
    label: "On model",
    experimental: true,
    quality: "medium", // keep within the 60s limit; on-model is slow at high
    instruction:
      "Worn by an elegant Indian woman as a professional fashion-jewellery e-commerce model shot (Myntra / Ajio luxe standard), framed from the collarbone up, tasteful saree or blouse neckline, clean light-grey seamless studio background, soft beauty lighting, tack-sharp focus on the jewellery, natural realistic skin and hair.",
  },
  {
    id: "model_closeup",
    label: "On model — close",
    experimental: true,
    quality: "medium",
    instruction:
      "Editorial macro of the necklace on an elegant Indian woman's neckline, the pendant and stones razor-sharp, soft flattering beauty lighting, gently blurred background, luxury jewellery campaign look.",
  },
  {
    id: "catalog_white",
    label: "White catalogue",
    quality: "medium",
    instruction:
      "Clean e-commerce catalogue main image on a pure seamless white (#FFFFFF) background, the piece centred and filling about 85% of the frame, even shadowless softbox lighting with crisp true-to-life colour, a faint natural contact shadow — the Amazon / Flipkart main-image standard.",
  },
];

/** Shared "shoot it like a premium jewellery e-commerce brand" direction. */
const ECOM_CLAUSE =
  "Professional jewellery e-commerce photography at the standard of Tanishq, " +
  "CaratLane, BlueStone and Myntra Luxe: ultra high resolution, tack-sharp focus " +
  "edge to edge, true-to-life gold tone and gemstone colour, clean controlled " +
  "studio lighting with soft highlights along the metal and no harsh glare or " +
  "colour cast, professional retouching, balanced composition.";

/** Shared fidelity clause — keep the EXACT uploaded piece. */
const FIDELITY_CLAUSE =
  "Reproduce the EXACT piece from the photo — do not beautify, redesign, smooth, " +
  "restyle or upgrade the jewellery. Keep the same shape, every gemstone and its exact " +
  "colour, every diamond, the exact metal tone and the chain/pendant layout. Do not add, " +
  "remove, recolour or distort any stones. Change only the background, lighting and camera " +
  "angle. No text, no watermark, no logos.";

/**
 * Compose the full OpenAI edit instruction for a shot: product subject
 * (title / category / tags) + the shot styling + the e-commerce quality bar +
 * the fidelity clause.
 */
export function buildInstruction(shot: Shot, subject: string): string {
  const subjectLine = subject ? `This is a photograph of ${subject}. ` : "";
  return `${subjectLine}${shot.instruction} ${ECOM_CLAUSE} ${FIDELITY_CLAUSE}`;
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
