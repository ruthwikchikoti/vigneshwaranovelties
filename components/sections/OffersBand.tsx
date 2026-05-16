"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import type { Offer, Category } from "@/lib/supabase/types";
import { localize } from "@/lib/supabase/types";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { IconArrowRight } from "@/components/ui/Icons";

type Props = {
  offers: Offer[];
  /** Used to resolve a category's slug so we can deep-link to its page. */
  categories?: Category[];
};

export function OffersBand({ offers, categories = [] }: Props) {
  const locale = useLocale() as "en" | "te";
  const t = useTranslations("offers");

  if (!offers.length) return null;

  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
      {offers.map((offer) => {
        const title = localize(offer, locale, "title");
        const desc = localize(offer, locale, "description");
        const url = offer.banner_url ?? placeholderImage(title, 1600, 800);
        const categorySlug = offer.category_id ? slugById.get(offer.category_id) : null;
        const href = categorySlug ? `/category/${categorySlug}` : "/offers";
        return (
          <Link
            href={href}
            key={offer.id}
            className="group relative overflow-hidden aspect-[16/9] sm:aspect-[2/1] bg-ink"
          >
            <Image
              src={ikImage(url, { width: 1400, format: "auto", quality: 85 })}
              alt={title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/50 to-transparent" />

            <div className="relative h-full flex flex-col justify-between p-7 sm:p-10 text-ivory">
              <div className="flex items-center gap-3">
                {offer.discount_pct ? (
                  <span className="font-display text-[2.5rem] text-champagne leading-none">
                    {offer.discount_pct}
                    <span className="text-base smallcaps ml-1">% {t("off")}</span>
                  </span>
                ) : (
                  <span className="smallcaps text-[0.6rem] text-champagne">
                    {t("limited")}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-display text-[1.75rem] sm:text-[2.25rem] leading-tight max-w-md">
                  {title}
                </h3>
                {desc ? (
                  <p className="text-ivory/70 text-[0.9rem] mt-2 max-w-md">{desc}</p>
                ) : null}
                <span className="inline-flex items-center gap-2 smallcaps text-[0.65rem] mt-5 text-champagne group-hover:gap-3 transition-all">
                  {t("discover")}
                  <IconArrowRight />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
