"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RecentItem = {
  product_id: string;
  snapshot: { title: string; price: number; image: string; slug: string };
  viewed_at: number;
};

type State = {
  items: RecentItem[];
  /** Records a product view. Moves it to the front if it was already in the list. */
  record: (item: Omit<RecentItem, "viewed_at">) => void;
  clear: () => void;
};

const MAX_ITEMS = 8;

export const useRecentlyViewed = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      record: (item) => {
        const rest = get().items.filter((i) => i.product_id !== item.product_id);
        set({
          items: [
            { ...item, viewed_at: Date.now() },
            ...rest,
          ].slice(0, MAX_ITEMS),
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "vn-recently-viewed" }
  )
);
