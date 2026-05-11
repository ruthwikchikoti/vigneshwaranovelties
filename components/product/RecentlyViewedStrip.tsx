"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useRecentlyViewed } from "@/lib/recently-viewed-store";
import { ikImage } from "@/lib/imagekit";
import { formatINR } from "@/lib/format";

type Props = {
  /** Exclude this product (typically the one currently being viewed). */
  excludeId?: string;
  /** Heading override. */
  title?: string;
};

export function RecentlyViewedStrip({ excludeId, title = "Recently viewed" }: Props) {
  const all = useRecentlyViewed((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Render nothing on the server / first paint to avoid a hydration mismatch.
  if (!mounted) return null;

  const items = all.filter((i) => i.product_id !== excludeId).slice(0, 8);
  if (items.length === 0) return null;

  return (
    <section className="py-8 lg:py-12 border-t border-ink/10">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between mb-4 lg:mb-6">
          <div>
            <p className="smallcaps text-[0.55rem] text-champagne-deep">For you</p>
            <h2 className="font-display text-[1.2rem] lg:text-[1.5rem] text-ink leading-tight mt-1">
              {title}
            </h2>
          </div>
        </div>

        <ul className="grid grid-flow-col auto-cols-[120px] sm:auto-cols-[140px] gap-3 sm:gap-4 overflow-x-auto scrollbar-hidden -mx-5 sm:mx-0 px-5 sm:px-0 pb-2">
          {items.map((it) => (
            <li key={it.product_id} className="group">
              <Link href={`/product/${it.snapshot.slug}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden bg-mist-soft">
                  <Image
                    src={ikImage(it.snapshot.image, { width: 320, format: "auto" })}
                    alt={it.snapshot.title}
                    fill
                    sizes="140px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pt-2 flex flex-col gap-0.5">
                  <p className="text-[0.8rem] font-display leading-tight text-ink line-clamp-2">
                    {it.snapshot.title}
                  </p>
                  <p className="tabular text-[0.72rem] text-ink/60">
                    {formatINR(it.snapshot.price)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
