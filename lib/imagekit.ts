/*
 * Build ImageKit URLs that proxy Supabase Storage.
 * Only ImageKit-hosted paths get transformed — external URLs pass through unchanged.
 */
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL;

type Transform = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "auto";
  focus?: "center" | "auto" | "face";
  blur?: number;
};

function buildTr(t: Transform): string {
  const params: string[] = [];
  if (t.width) params.push(`w-${t.width}`);
  if (t.height) params.push(`h-${t.height}`);
  if (t.quality) params.push(`q-${t.quality}`);
  if (t.format) params.push(`f-${t.format}`);
  if (t.focus) params.push(`fo-${t.focus}`);
  if (t.blur) params.push(`bl-${t.blur}`);
  return params.length ? `tr=${params.join(",")}` : "";
}

// ImageKit's origin is the Supabase public "product-images" bucket, so an
// in-bucket path maps 1:1 to the ImageKit endpoint.
const BUCKET_MARKER = "/storage/v1/object/public/product-images/";

export function ikImage(src: string | null | undefined, t: Transform = {}): string {
  if (!src) return "";

  // No real ImageKit configured yet: pass through whatever was given.
  if (!IMAGEKIT_URL || IMAGEKIT_URL.includes("placeholder")) {
    return src;
  }

  const tr = buildTr(t);

  // Already an ImageKit URL → just append the transform.
  if (src.startsWith(IMAGEKIT_URL)) {
    const sep = src.includes("?") ? "&" : "?";
    return tr ? `${src}${sep}${tr}` : src;
  }

  // Supabase Storage public URL for our bucket → serve it THROUGH ImageKit so it
  // gets resized + auto WebP/AVIF (a 1.5MB PNG becomes ~20KB). Preserve any
  // cache-bust ?v= token.
  const idx = src.indexOf(BUCKET_MARKER);
  if (idx !== -1) {
    const rest = src.slice(idx + BUCKET_MARKER.length);
    const [path, query] = rest.split("?");
    const qs = [tr, query].filter(Boolean).join("&");
    return `${IMAGEKIT_URL}/${path}${qs ? `?${qs}` : ""}`;
  }

  // Any other external URL (Unsplash, picsum placeholders, etc.): pass through.
  if (src.startsWith("http")) return src;

  // Relative path → serve from ImageKit.
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `${IMAGEKIT_URL}/${path}${tr ? `?${tr}` : ""}`;
}

export function placeholderImage(label: string, w = 800, h = 1000): string {
  const text = encodeURIComponent(label);
  return `https://placehold.co/${w}x${h}/0F0E0C/C9A24A?text=${text}&font=playfair`;
}
