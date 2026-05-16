"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";
import { ButtonLink } from "@/components/ui/Button";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { ikImage } from "@/lib/imagekit";
import { formatINR } from "@/lib/format";
import { IconArrowRight } from "@/components/ui/Icons";

export function CartView() {
  const t = useTranslations("cart");
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const subtotal = items.reduce((sum, i) => sum + i.snapshot.price * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="py-20 lg:py-32 text-center max-w-md mx-auto flex flex-col items-center gap-6">
        <p className="smallcaps text-[0.65rem] text-champagne-deep">{t("title")}</p>
        <h1 className="font-display text-[2.5rem] lg:text-[3.5rem] text-ink leading-tight">
          {t("empty")}
        </h1>
        <ButtonLink href="/category/1gram-gold" variant="ink">
          {t("emptyCta")}
          <IconArrowRight />
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep mb-3">
          {t("title")}
        </p>
        <h1 className="font-display text-[2.5rem] lg:text-[3.25rem] text-ink leading-none mb-2">
          {t("subtitle")}
        </h1>

        <div className="divider-gold w-24 my-8" />

        <ul className="flex flex-col divide-y divide-ink/10">
          {items.map((item) => (
            <li key={item.product_id} className="py-6 flex gap-4 sm:gap-6">
              <Link
                href={`/product/${item.snapshot.slug}`}
                className="relative w-24 h-32 sm:w-32 sm:h-40 flex-shrink-0 overflow-hidden bg-mist"
              >
                <Image
                  src={ikImage(item.snapshot.image, { width: 320, format: "auto" })}
                  alt={item.snapshot.title}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link
                    href={`/product/${item.snapshot.slug}`}
                    className="font-display text-[1.2rem] sm:text-[1.4rem] text-ink leading-tight line-clamp-2 hover:text-champagne-deep transition-colors"
                  >
                    {item.snapshot.title}
                  </Link>
                  <p className="tabular text-sm text-ink/70 mt-2">
                    {formatINR(item.snapshot.price)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="inline-flex items-center border border-ink/15">
                    <button
                      type="button"
                      onClick={() =>
                        setQty(item.product_id, Math.max(1, item.qty - 1))
                      }
                      className="w-8 h-8 grid place-items-center text-ink/70 hover:text-ink"
                      aria-label={t("decrease")}
                    >
                      −
                    </button>
                    <span className="w-8 text-center tabular text-sm">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.product_id, item.qty + 1)}
                      className="w-8 h-8 grid place-items-center text-ink/70 hover:text-ink"
                      aria-label={t("increase")}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.product_id)}
                    className="smallcaps text-[0.6rem] text-ink/50 hover:text-cognac transition-colors"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/category/1gram-gold"
          className="inline-flex items-center gap-2 smallcaps text-[0.65rem] text-ink/60 hover:text-ink mt-8"
        >
          ← {t("continueShopping")}
        </Link>
      </div>

      {/* Form + summary */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="bg-mist-soft p-6 lg:p-10 border border-ink/5">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-ink/10">
            <span className="smallcaps text-[0.65rem] text-ink/70">{t("subtotal")}</span>
            <span className="tabular text-[1.5rem] font-display text-ink">
              {formatINR(subtotal)}
            </span>
          </div>
          <p className="text-ink/60 text-xs leading-relaxed mb-6">{t("subtotalNote")}</p>

          <InquiryForm
            source="cart"
            initialItems={items}
            compact
          />
        </div>
      </div>
    </div>
  );
}
