"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/lib/recently-viewed-store";

type Props = {
  product_id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
};

export function RecentlyViewedTracker({ product_id, title, price, image, slug }: Props) {
  const record = useRecentlyViewed((s) => s.record);
  useEffect(() => {
    record({ product_id, snapshot: { title, price, image, slug } });
  }, [product_id, title, price, image, slug, record]);
  return null;
}
