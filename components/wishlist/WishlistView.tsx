"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart } from "@/lib/cart-store";
import { ikImage } from "@/lib/imagekit";
import { formatINR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

export function WishlistView() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const addToCart = useCart((s) => s.add);
  const cartHas = useCart((s) => s.has);

  // Hydration guard — same reason as WishlistButton: don't flash an empty
  // wishlist while the persisted state is still being read.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="py-20 lg:py-32 text-center text-sm text-ink/40">Loading saved pieces…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-20 lg:py-32 text-center max-w-md mx-auto flex flex-col items-center gap-6">
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Saved pieces</p>
        <h1 className="font-display text-[2.5rem] lg:text-[3.5rem] text-ink leading-tight">
          Nothing saved yet.
        </h1>
        <p className="text-ink/60 text-sm">
          Tap the heart on any piece to save it here for later.
        </p>
        <ButtonLink href="/category/1gram-gold" variant="ink">
          Browse collections
          <IconArrowRight />
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-20">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-3">Saved pieces</p>
      <h1 className="font-display text-[2.5rem] lg:text-[3.25rem] text-ink leading-none mb-2">
        Your saved pieces
      </h1>
      <p className="text-ink/55 text-sm mb-10 tabular">
        {items.length} piece{items.length === 1 ? "" : "s"}
      </p>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
        {items.map((item) => {
          const inCart = cartHas(item.product_id);
          return (
            <li key={item.product_id} className="group">
              <Link
                href={`/product/${item.snapshot.slug}`}
                className="block relative aspect-[4/5] overflow-hidden bg-mist-soft"
              >
                <Image
                  src={ikImage(item.snapshot.image, { width: 800, format: "auto" })}
                  alt={item.snapshot.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </Link>
              <div className="pt-4 flex flex-col gap-2">
                <Link
                  href={`/product/${item.snapshot.slug}`}
                  className="font-display text-[1.05rem] leading-tight text-ink line-clamp-2 hover:text-champagne-deep transition-colors"
                >
                  {item.snapshot.title}
                </Link>
                <p className="tabular text-sm text-ink/75">
                  {formatINR(item.snapshot.price)}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    disabled={inCart}
                    onClick={() =>
                      addToCart({
                        product_id: item.product_id,
                        qty: 1,
                        snapshot: item.snapshot,
                      })
                    }
                    className="smallcaps text-[0.55rem] px-2.5 py-1.5 bg-ink text-ivory hover:bg-ink-soft disabled:bg-champagne disabled:text-ink transition-colors"
                  >
                    {inCart ? "Added" : "Inquire"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.product_id)}
                    className="smallcaps text-[0.55rem] text-ink/40 hover:text-vermilion transition-colors"
                    aria-label="Remove from saved"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
