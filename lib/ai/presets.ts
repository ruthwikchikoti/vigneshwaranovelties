/**
 * The shot list for the AI Studio. Two engines, both on AWS Bedrock:
 *
 *  - engine "studio" (tier "exact"): Remove Background → composite the EXACT
 *    cutout onto a studio backdrop. 100% faithful to the uploaded piece.
 *  - engine "scene" (tier "styled"): Stable Image Control Structure — generates
 *    a styled scene (marble/lifestyle/angle) GUIDED BY the piece's structure at
 *    high control_strength, with a FIXED seed so output is deterministic and
 *    stays close to the original upload. Details are re-rendered, so these are
 *    flagged "styled" in the review grid.
 */
export type Hex = string;

export type Backdrop =
  | { kind: "radial"; inner: Hex; outer: Hex }
  | { kind: "linear"; top: Hex; bottom: Hex };

export type Tier = "exact" | "styled";

export type StudioShot = {
  id: string;
  label: string;
  engine: "studio";
  tier: "exact";
  backdrop: Backdrop;
  reflection: boolean;
  shadow: boolean;
  vignette: boolean;
  crop?: boolean;
};

export type SceneShot = {
  id: string;
  label: string;
  engine: "scene";
  tier: "styled";
  /** Scene/styling guidance appended to the product-derived prompt. */
  scene: string;
  /** 0..1 — higher = stay closer to the uploaded piece's structure. */
  controlStrength: number;
};

export type Shot = StudioShot | SceneShot;

/** Back-compat alias: lib/ai/compose.ts composites a StudioShot. */
export type BackgroundPreset = StudioShot;

export const SHOTS: Shot[] = [
  {
    id: "white_studio",
    label: "White studio",
    engine: "studio",
    tier: "exact",
    backdrop: { kind: "radial", inner: "#ffffff", outer: "#e9e7e2" },
    reflection: false,
    shadow: true,
    vignette: false,
  },
  {
    id: "charcoal_luxe",
    label: "Charcoal luxe",
    engine: "studio",
    tier: "exact",
    backdrop: { kind: "radial", inner: "#2b2720", outer: "#0c0b0a" },
    reflection: true,
    shadow: false,
    vignette: true,
  },
  {
    id: "macro_detail",
    label: "Macro detail",
    engine: "studio",
    tier: "exact",
    backdrop: { kind: "radial", inner: "#ffffff", outer: "#ece9e3" },
    reflection: false,
    shadow: true,
    vignette: false,
    crop: true,
  },
  {
    id: "marble_lifestyle",
    label: "Marble lifestyle",
    engine: "scene",
    tier: "styled",
    scene:
      "displayed on a polished white marble surface with soft natural daylight and gentle shadow, premium lifestyle catalog still life",
    controlStrength: 0.9,
  },
  {
    id: "golden_angle",
    label: "Golden angle",
    engine: "scene",
    tier: "styled",
    scene:
      "three-quarter angled hero on a dark reflective surface with a warm golden key light and soft bokeh, luxury advertising photograph",
    controlStrength: 0.9,
  },
  {
    id: "ivory_glow",
    label: "Ivory glow",
    engine: "studio",
    tier: "exact",
    backdrop: { kind: "radial", inner: "#fbf7ef", outer: "#ece1cf" },
    reflection: true,
    shadow: false,
    vignette: false,
  },
];

/** Pick the first N shots (deterministic, aligned by index for retries). */
export function selectShots(count: number): Shot[] {
  const n = Math.max(1, Math.min(SHOTS.length, count));
  return SHOTS.slice(0, n);
}

export function shotLabel(id: string | null): string {
  return SHOTS.find((s) => s.id === id)?.label ?? id ?? "Variant";
}

export function shotTier(id: string | null): Tier | null {
  return SHOTS.find((s) => s.id === id)?.tier ?? null;
}
