"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  product_id: string;
  snapshot: { title: string; price: number; image: string; slug: string };
  added_at: number;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: Omit<WishlistItem, "added_at">) => void;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
  count: () => number;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.product_id === item.product_id);
        if (exists) {
          set({ items: get().items.filter((i) => i.product_id !== item.product_id) });
        } else {
          set({
            items: [
              { ...item, added_at: Date.now() },
              ...get().items,
            ],
          });
        }
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.product_id !== productId) }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some((i) => i.product_id === productId),
      count: () => get().items.length,
    }),
    { name: "vn-wishlist" }
  )
);
