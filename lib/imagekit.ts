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

export function ikImage(src: string | null | undefined, t: Transform = {}): string {
  if (!src) return "";

  // External URL not on our ImageKit account: pass through.
  if (src.startsWith("http") && !(IMAGEKIT_URL && src.startsWith(IMAGEKIT_URL))) {
    return src;
  }

  // No real ImageKit configured yet: pass through whatever was given.
  if (!IMAGEKIT_URL || IMAGEKIT_URL.includes("placeholder")) {
    return src;
  }

  const tr = buildTr(t);
  if (src.startsWith(IMAGEKIT_URL)) {
    const sep = src.includes("?") ? "&" : "?";
    return tr ? `${src}${sep}${tr}` : src;
  }

  const path = src.startsWith("/") ? src : `/${src}`;
  return `${IMAGEKIT_URL}${path}${tr ? `?${tr}` : ""}`;
}

export function placeholderImage(label: string, w = 800, h = 1000): string {
  const text = encodeURIComponent(label);
  return `https://placehold.co/${w}x${h}/0F0E0C/C9A24A?text=${text}&font=playfair`;
}
