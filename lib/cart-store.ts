"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InquiryItem } from "./supabase/types";

type CartState = {
  items: InquiryItem[];
  add: (item: InquiryItem) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  has: (productId: string) => boolean;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const existing = get().items.find((i) => i.product_id === item.product_id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.product_id === item.product_id ? { ...i, qty: i.qty + item.qty } : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.product_id !== productId) }),
      setQty: (productId, qty) =>
        set({
          items: get()
            .items.map((i) => (i.product_id === productId ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      has: (productId) => get().items.some((i) => i.product_id === productId),
    }),
    { name: "vn-cart" }
  )
);
