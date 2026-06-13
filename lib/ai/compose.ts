import "server-only";
import sharp from "sharp";
import type { Backdrop, BackgroundPreset } from "./presets";

/**
 * Composite a transparent product cutout onto a studio backdrop.
 *
 * Techniques (per real jewellery photography): a gradient sweep rendered from
 * SVG (the piece sits on the lightest area), an optional mirror reflection
 * (vertical flip + fade), a soft alpha-based contact shadow, and an edge
 * vignette. Deterministic — same cutout + preset always yields the same image.
 * Runs on the Node.js runtime (sharp is native; not available on edge).
 */

const CANVAS = 1280; // square output, px
const MARGIN = 0.13; // safe padding around the piece

export type ComposedImage = { bytes: Uint8Array; contentType: "image/webp" };

function backdropSvg(bg: Backdrop): string {
  const grad =
    bg.kind === "radial"
      ? `<radialGradient id="g" cx="50%" cy="40%" r="78%">
           <stop offset="0%" stop-color="${bg.inner}"/>
           <stop offset="100%" stop-color="${bg.outer}"/>
         </radialGradient>`
      : `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="${bg.top}"/>
           <stop offset="100%" stop-color="${bg.bottom}"/>
         </linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
    <defs>${grad}</defs><rect width="${CANVAS}" height="${CANVAS}" fill="url(#g)"/></svg>`;
}

function vignetteSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}">
    <defs><radialGradient id="v" cx="50%" cy="48%" r="72%">
      <stop offset="52%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.5"/>
    </radialGradient></defs>
    <rect width="${CANVAS}" height="${CANVAS}" fill="url(#v)"/></svg>`;
}

function reflectionMaskSvg(w: number, h: number, maxOpacity: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="${maxOpacity}"/>
      <stop offset="62%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#m)"/></svg>`;
}

export async function composePreset(
  cutoutPng: Uint8Array,
  preset: BackgroundPreset
): Promise<ComposedImage> {
  const src = sharp(Buffer.from(cutoutPng), { failOn: "none" }).ensureAlpha();

  // 1. Trim the transparent margin so framing is consistent across products.
  let work: Buffer;
  try {
    work = await src.clone().trim({ threshold: 10 }).toBuffer();
  } catch {
    work = await src.clone().toBuffer();
  }

  // 2. Macro: crop tight to the lower-centre (where pendants hang).
  if (preset.crop) {
    const m = await sharp(work).metadata();
    const w = m.width ?? CANVAS;
    const h = m.height ?? CANVAS;
    const cw = Math.max(64, Math.round(w * 0.6));
    const ch = Math.max(64, Math.round(h * 0.55));
    work = await sharp(work)
      .extract({
        left: Math.round((w - cw) / 2),
        top: Math.round(h * 0.3),
        width: cw,
        height: Math.min(ch, h - Math.round(h * 0.3)),
      })
      .toBuffer();
  }

  // 3. Resize to fit inside the padded inner box.
  const inner = Math.round(CANVAS * (1 - MARGIN * 2));
  const fitted = await sharp(work)
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const fw = fitted.info.width;
  const fh = fitted.info.height;
  const left = Math.round((CANVAS - fw) / 2);

  // Anchor higher when reflecting so the reflection has room below.
  const minTop = Math.round(CANVAS * MARGIN);
  const top = preset.reflection
    ? Math.max(minTop, Math.round(CANVAS * 0.56) - fh)
    : Math.round((CANVAS - fh) / 2);

  const layers: sharp.OverlayOptions[] = [];

  // 4. Contact shadow (matte/grounded looks).
  if (preset.shadow) {
    try {
      const mask = await sharp(fitted.data)
        .extractChannel("alpha")
        .blur(20)
        .linear(0.3, 0)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const shadow = await sharp({
        create: { width: fw, height: fh, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .joinChannel(mask.data, {
          raw: { width: mask.info.width, height: mask.info.height, channels: 1 },
        })
        .png()
        .toBuffer();
      layers.push({
        input: shadow,
        left: left + Math.round(CANVAS * 0.004),
        top: top + Math.round(CANVAS * 0.016),
      });
    } catch {
      /* shadow is a nicety; never fail the compose over it */
    }
  }

  // 5. Mirror reflection (floating/luxury looks).
  if (preset.reflection) {
    try {
      const flipped = await sharp(fitted.data).flip().ensureAlpha().png().toBuffer();
      const mask = Buffer.from(reflectionMaskSvg(fw, fh, 0.28));
      const reflection = await sharp(flipped)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      layers.push({ input: reflection, left, top: top + fh - 2 });
    } catch {
      /* reflection optional */
    }
  }

  // 6. The piece on top.
  layers.push({ input: fitted.data, left, top });

  // 7. Vignette over everything for depth.
  if (preset.vignette) {
    layers.push({ input: Buffer.from(vignetteSvg()), left: 0, top: 0 });
  }

  const out = await sharp(Buffer.from(backdropSvg(preset.backdrop)))
    .composite(layers)
    .webp({ quality: 90 })
    .toBuffer();

  return { bytes: new Uint8Array(out), contentType: "image/webp" };
}
