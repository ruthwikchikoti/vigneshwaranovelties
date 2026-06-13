"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Product } from "@/lib/supabase/types";
import { localize } from "@/lib/supabase/types";
import { discountPercent, formatINR } from "@/lib/format";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { displayUrl, publicGalleryImages } from "@/lib/product-images";
import { useCart } from "@/lib/cart-store";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  variant?: "default" | "large" | "compact";
  priority?: boolean;
};

export function ProductCard({ product, variant = "default", priority }: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "te";
  const cart = useCart();
  const inCart = cart.has(product.id);

  const title = localize(product, locale, "title");
  // Owner originals + approved AI variants only (hide pending/rejected).
  const gallery = publicGalleryImages(product.images);
  const primary = gallery.find((i) => i.is_primary) ?? gallery[0];
  const secondary = gallery.find((i) => i.id !== primary?.id) ?? primary;
  const primaryUrl = primary ? displayUrl(primary) : placeholderImage(title);
  const secondaryUrl = secondary ? displayUrl(secondary) : primaryUrl;
  const discountPct = discountPercent(product.price_inr, product.discount_price_inr);

  const sizes = {
    default: "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
    large: "(min-width: 1024px) 50vw, 100vw",
    compact: "(min-width: 1024px) 20vw, 50vw",
  }[variant];

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    cart.add({
      product_id: product.id,
      qty: 1,
      snapshot: {
        title,
        price: product.discount_price_inr ?? product.price_inr,
        image: primaryUrl,
        slug: product.slug,
      },
    });
  };

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist-soft">
        <Image
          src={ikImage(primaryUrl, { width: 800, format: "auto", quality: 85 })}
          alt={title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover product-card-image"
        />
        {/* Hover image (secondary) */}
        {secondaryUrl !== primaryUrl ? (
          <Image
            src={ikImage(secondaryUrl, { width: 800, format: "auto", quality: 85 })}
            alt=""
            fill
            sizes={sizes}
            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            aria-hidden
          />
        ) : null}

        {/* Badges (top-left) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_new_arrival ? (
            <Badge variant="ivory">{t("badgeNew")}</Badge>
          ) : null}
          {product.has_sale_badge && discountPct ? (
            <Badge variant="sale">−{discountPct}%</Badge>
          ) : null}
          {product.has_offer_badge ? (
            <Badge variant="gold">{t("badgeOffer")}</Badge>
          ) : null}
        </div>

        {/* Wishlist heart — always visible top-right */}
        <WishlistButton
          product_id={product.id}
          snapshot={{
            title,
            price: product.discount_price_inr ?? product.price_inr,
            image: primaryUrl,
            slug: product.slug,
          }}
        />

        {/* Quick add — hover only, sits below the heart */}
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "absolute top-14 right-3 w-8 h-8 grid place-items-center rounded-full transition-all duration-300",
            inCart
              ? "bg-champagne text-ink"
              : "bg-ivory/90 text-ink hover:bg-ink hover:text-ivory opacity-0 group-hover:opacity-100"
          )}
          aria-label={inCart ? t("added") : t("addToInquiry")}
        >
          {inCart ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>

        {product.stock_status === "sold_out" ? (
          <div className="absolute inset-0 bg-ivory/80 grid place-items-center">
            <span className="smallcaps text-[0.7rem] text-ink">{t("sold")}</span>
          </div>
        ) : null}
      </div>

      <div className="pt-4 pb-2 flex flex-col gap-1.5">
        <p className="smallcaps text-[0.6rem] text-champagne-deep">
          {product.category ? localize(product.category, locale, "name") : ""}
        </p>
        <h3 className="font-display text-[1.05rem] sm:text-[1.15rem] leading-tight text-ink line-clamp-2">
          {title}
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          {product.discount_price_inr ? (
            <>
              <span className="tabular text-sm text-ink font-medium">
                {formatINR(product.discount_price_inr)}
              </span>
              <span className="tabular text-xs text-ink/40 line-through">
                {formatINR(product.price_inr)}
              </span>
            </>
          ) : (
            <span className="tabular text-sm text-ink">
              {formatINR(product.price_inr)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
