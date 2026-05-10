"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { whatsappGeneral } from "@/lib/whatsapp";
import { ikImage } from "@/lib/imagekit";

type HeroProps = {
  imageDesktop: string;
  imageMobile?: string;
};

export function Hero({ imageDesktop, imageMobile }: HeroProps) {
  const t = useTranslations("hero");
  const locale = useLocale() as "en" | "te";
  const mobile = imageMobile ?? imageDesktop;

  return (
    <section className="relative min-h-[calc(100dvh-64px)] lg:min-h-[88vh] grid grid-cols-1 lg:grid-cols-12 grain overflow-hidden">
      {/* Image side */}
      <div className="relative col-span-1 lg:col-span-7 lg:order-2 h-[60vh] lg:h-auto">
        <Image
          src={ikImage(mobile, { width: 900, format: "auto", quality: 88 })}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover lg:hidden"
        />
        <Image
          src={ikImage(imageDesktop, { width: 1800, format: "auto", quality: 90 })}
          alt=""
          fill
          priority
          sizes="60vw"
          className="object-cover hidden lg:block"
        />
        {/* Subtle warmth */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/0 via-ink/0 to-ink/30 lg:bg-none pointer-events-none" />

        {/* Floating editorial caption (desktop only) */}
        <div className="hidden lg:block absolute bottom-12 left-12 max-w-xs">
          <div className="bg-ivory/90 backdrop-blur-sm p-6 border-l-2 border-champagne">
            <p className="smallcaps text-[0.55rem] text-champagne-deep mb-2">
              The atelier
            </p>
            <p className="font-display-italic text-[1.4rem] leading-tight text-ink">
              "Each piece carries the steady hand of three generations."
            </p>
          </div>
        </div>
      </div>

      {/* Text side */}
      <div className="col-span-1 lg:col-span-5 lg:order-1 flex flex-col justify-center bg-ivory px-6 sm:px-12 lg:px-16 py-12 lg:py-0 relative">
        <div className="max-w-lg">
          <p className="smallcaps text-[0.65rem] text-champagne-deep mb-6 sm:mb-8">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-[2.5rem] sm:text-[3.75rem] lg:text-[5rem] xl:text-[6.25rem] leading-[0.92] text-ink mb-1">
            <span className="block rise">
              <span style={{ animationDelay: "0.05s" }}>{t("lineOne")}</span>
            </span>
            <span className="block rise">
              <span style={{ animationDelay: "0.18s" }} className="font-display-italic">
                {t("lineTwo")}
              </span>
            </span>
            <span className="block rise">
              <span style={{ animationDelay: "0.32s" }}>{t("lineThree")}</span>
            </span>
          </h1>

          {/* Hairline divider */}
          <div
            className="divider-gold my-8 lg:my-10 origin-left"
            style={{
              animation: "rise 1.2s var(--ease-luxe) 0.6s both",
            }}
          />

          <p className="text-ink/70 text-[1rem] leading-relaxed max-w-md mb-8 lg:mb-10">
            {t("subline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <ButtonLink
              href="/category/jewelry"
              variant="ink"
              className="group"
            >
              {t("ctaPrimary")}
              <IconArrowRight className="transition-transform group-hover:translate-x-1" />
            </ButtonLink>
            <a
              href={whatsappGeneral(locale)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-ghost"
            >
              <IconWhatsapp size={14} />
              {t("ctaSecondary")}
            </a>
          </div>
        </div>

        {/* Decorative corner accent */}
        <div className="absolute bottom-6 right-6 hidden lg:flex items-center gap-3 text-[0.6rem] tracking-[0.3em] uppercase text-ink/40">
          <span className="w-8 h-px bg-champagne/50" />
          <span>Scroll</span>
        </div>
      </div>
    </section>
  );
}
