import type { Offer, Product } from "@/lib/supabase/types";

/** An offer is "live" right now if active and within its date window (if any). */
export function isLiveOffer(offer: Offer, now = new Date()): boolean {
  if (!offer.is_active) return false;
  const t = now.getTime();
  if (offer.starts_at) {
    const start = new Date(offer.starts_at).getTime();
    if (Number.isFinite(start) && start > t) return false;
  }
  if (offer.ends_at) {
    const end = new Date(offer.ends_at).getTime();
    if (Number.isFinite(end) && end < t) return false;
  }
  return true;
}

/**
 * For each category that has a live offer, returns the strongest discount % currently
 * applicable. If two offers target the same category, the larger discount wins.
 */
export function liveOffersByCategory(offers: Offer[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of offers) {
    if (!o.category_id || !o.discount_pct || o.discount_pct <= 0) continue;
    if (!isLiveOffer(o)) continue;
    const current = map.get(o.category_id) ?? 0;
    if (o.discount_pct > current) map.set(o.category_id, o.discount_pct);
  }
  return map;
}

/**
 * Returns a new array of products with category-wide offer discounts applied.
 *
 * For each product whose category has a live offer:
 *   - compute offerPrice = round(price * (1 - discount%/100))
 *   - if offerPrice is lower than the product's existing discount_price_inr (or price_inr
 *     when no per-product sale is set), the offer takes over and the sale badge is flipped on
 *   - otherwise the existing per-product price stands (per-product sales can be deeper than
 *     a category-wide promo, e.g. clearance)
 *
 * Returns the same product references when nothing changes, so React can cheaply diff them.
 */
export function applyCategoryOffers(products: Product[], offers: Offer[]): Product[] {
  const byCategory = liveOffersByCategory(offers);
  if (byCategory.size === 0) return products;

  return products.map((p) => {
    if (!p.category_id) return p;
    const pct = byCategory.get(p.category_id);
    if (!pct) return p;
    const offerPrice = Math.round(p.price_inr * (1 - pct / 100));
    const currentBest = p.discount_price_inr ?? p.price_inr;
    if (offerPrice >= currentBest) return p;
    return {
      ...p,
      discount_price_inr: offerPrice,
      has_sale_badge: true,
    };
  });
}

/** Single-product variant — convenient for the PDP. */
export function applyCategoryOffer(product: Product, offers: Offer[]): Product {
  return applyCategoryOffers([product], offers)[0];
}
