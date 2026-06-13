import type { ProductImage } from "@/lib/supabase/types";

/**
 * The URL to actually render for an image. AI rows store the result in
 * ai_generated_url (original_url holds the source photo for provenance);
 * original photos render original_url directly.
 */
export function displayUrl(img: ProductImage): string {
  if (img.ai_status !== "none" && img.ai_generated_url) return img.ai_generated_url;
  return img.original_url;
}

/**
 * Images safe to show on the public storefront: the owner's originals plus any
 * AI variants the owner has explicitly approved. Pending/rejected AI rows are
 * hidden. Sorted: originals first (by sort_order), then approved AI.
 */
export function publicGalleryImages(images: ProductImage[] | undefined | null): ProductImage[] {
  if (!images?.length) return [];
  return images
    .filter((img) => img.ai_status === "none" || img.ai_status === "approved")
    .sort((a, b) => {
      // originals (ai_status 'none') always lead approved AI images
      const aAi = a.ai_status === "none" ? 0 : 1;
      const bAi = b.ai_status === "none" ? 0 : 1;
      if (aAi !== bAi) return aAi - bAi;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
}

/** The original photos only (ai_status 'none'). */
export function originalImages(images: ProductImage[] | undefined | null): ProductImage[] {
  if (!images?.length) return [];
  return images
    .filter((img) => (img.ai_status ?? "none") === "none")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** AI variant rows in any review state, newest jobs implicitly grouped by caller. */
export function aiImages(images: ProductImage[] | undefined | null): ProductImage[] {
  if (!images?.length) return [];
  return images
    .filter((img) => img.ai_status && img.ai_status !== "none")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
