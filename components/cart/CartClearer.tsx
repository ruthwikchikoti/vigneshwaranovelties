"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

/**
 * Empties the cart on mount. Drop this on a "thank you" page after a successful
 * inquiry — it clears the cart only after the user has already navigated away
 * from /cart, so they never see an empty-cart flash mid-navigation.
 */
export function CartClearer() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
