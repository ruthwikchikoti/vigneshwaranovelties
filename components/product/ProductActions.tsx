"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { useCart } from "@/lib/cart-store";
import { whatsappForProduct } from "@/lib/whatsapp";
import { localize } from "@/lib/supabase/types";
import type { Product } from "@/lib/supabase/types";
import { BuyNowModal } from "./BuyNowModal";
import { cn } from "@/lib/utils";

export function ProductActions({ product }: { product: Product }) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "te";
  const cart = useCart();
  const [open, setOpen] = useState(false);

  const inCart = cart.has(product.id);
  const title = localize(product, locale, "title");
  const primary = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const price = product.discount_price_inr ?? product.price_inr;
  const isAvailable = product.stock_status !== "sold_out";

  const handleAddToInquiry = () => {
    cart.add({
      product_id: product.id,
      qty: 1,
      snapshot: {
        title,
        price,
        image: primary?.original_url ?? "",
        slug: product.slug,
      },
    });
  };

  return (
    <>
      {/* Desktop / inline actions */}
      <div className="hidden lg:flex flex-col gap-3">
        <Button
          variant="ink"
          size="lg"
          onClick={() => setOpen(true)}
          disabled={!isAvailable}
          fullWidth
        >
          {isAvailable ? t("buyNow") : t("sold_out")}
        </Button>

        <Button
          variant={inCart ? "gold" : "ghost"}
          size="lg"
          onClick={handleAddToInquiry}
          disabled={!isAvailable}
          fullWidth
        >
          {inCart ? t("added") : t("addToInquiry")}
        </Button>

        <a
          href={whatsappForProduct({ title, slug: product.slug, price }, locale)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("btn-base btn-whatsapp w-full")}
        >
          <IconWhatsapp size={14} />
          {t("inquireWhatsapp")}
        </a>
      </div>

      {/* Mobile sticky bottom bar (above the bottom nav) */}
      <div className="lg:hidden fixed inset-x-0 bottom-[60px] z-30 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 grid grid-cols-2 gap-2 safe-bottom">
        <a
          href={whatsappForProduct({ title, slug: product.slug, price }, locale)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-base btn-whatsapp text-[0.7rem] py-3"
        >
          <IconWhatsapp size={14} />
          WhatsApp
        </a>
        <Button
          variant="ink"
          onClick={() => setOpen(true)}
          disabled={!isAvailable}
          className="text-[0.7rem] py-3"
        >
          {isAvailable ? t("buyNow") : t("sold_out")}
        </Button>
      </div>

      <BuyNowModal open={open} onClose={() => setOpen(false)} product={product} />
    </>
  );
}
