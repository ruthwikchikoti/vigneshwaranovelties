"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { InquiryForm } from "@/components/forms/InquiryForm";
import type { Product } from "@/lib/supabase/types";
import { localize } from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { ikImage } from "@/lib/imagekit";

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product;
};

export function BuyNowModal({ open, onClose, product }: Props) {
  const t = useTranslations("inquiry");
  const locale = useLocale() as "en" | "te";
  const title = localize(product, locale, "title");
  const primary = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const price = product.discount_price_inr ?? product.price_inr;

  return (
    <Modal open={open} onClose={onClose} title={t("title")} size="md">
      {/* Product summary */}
      <div className="flex gap-4 pb-6 mb-6 border-b border-ink/10">
        {primary ? (
          <div className="relative w-20 h-24 flex-shrink-0 overflow-hidden bg-mist">
            <Image
              src={ikImage(primary.original_url, { width: 240, format: "auto" })}
              alt={title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="smallcaps text-[0.55rem] text-champagne-deep">
            {product.category ? localize(product.category, locale, "name") : ""}
          </p>
          <h3 className="font-display text-[1.1rem] text-ink leading-tight mt-1 line-clamp-2">
            {title}
          </h3>
          <p className="tabular text-sm text-ink mt-2">{formatINR(price)}</p>
        </div>
      </div>

      <InquiryForm
        source="buy_now"
        initialItems={[
          {
            product_id: product.id,
            qty: 1,
            snapshot: {
              title,
              price,
              image: primary?.original_url ?? "",
              slug: product.slug,
            },
          },
        ]}
        onSuccess={onClose}
        compact
      />
    </Modal>
  );
}
