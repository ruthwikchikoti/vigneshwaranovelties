"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { whatsappGeneral } from "@/lib/whatsapp";
import { ikImage } from "@/lib/imagekit";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  imageDesktop: string;
  imageMobile?: string | null;
  linkUrl?: string | null;
  title?: string;
  /** Optional overlay label rendered on top-left of the image (e.g. "DIWALI EDIT"). */
  badgeText?: string | null;
};

type HeroProps = {
  slides: HeroSlide[];
  /** Seconds per slide. */
  intervalSec?: number;
  /** Primary “browse” CTA when you have a default collection (e.g. first category slug). */
  primaryBrowseHref?: string;
};

const FADE_MS = 700; // matches the slow ease-out-quart timing in the design system

export function Hero({
  slides,
  intervalSec = 4,
  primaryBrowseHref = "/search",
}: HeroProps) {
  const t = useTranslations("hero");
  const locale = useLocale() as "en" | "te";

  const safeSlides = slides.length > 0 ? slides : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Track which slides have been shown so we only ever fetch a banner image
  // once it's actually needed (slide 0 up front, the rest as the carousel
  // reaches them). Keeps the homepage from downloading every banner at once.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  useEffect(() => {
    setSeen((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, [index]);
  const reducedMotion = usePrefersReducedMotion();
  const shouldRotate = safeSlides.length > 1 && !reducedMotion && !paused;

  // Auto-advance — only when multiple slides + user hasn't paused + motion allowed.
  useEffect(() => {
    if (!shouldRotate) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safeSlides.length);
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [shouldRotate, intervalSec, safeSlides.length]);

  // Clamp the active index if the slide list shrinks (e.g. after a refresh).
  useEffect(() => {
    if (index >= safeSlides.length) setIndex(0);
  }, [index, safeSlides.length]);

  return (
    <section className="relative grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-20 mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12 py-12 lg:py-24 xl:py-32 grain overflow-hidden min-h-[calc(100dvh-72px-32px)]">
      {/* Text — left on desktop, top on mobile */}
      <div className="flex flex-col justify-center gap-7 lg:gap-9 order-2 lg:order-1 max-w-xl">
        <p className="smallcaps text-[0.7rem] text-champagne-deep">{t("eyebrow")}</p>
        <h1 className="font-display text-[2.5rem] sm:text-[3.5rem] lg:text-[5rem] xl:text-[5.75rem] text-ink m-0">
          <span className="block rise">
            <span style={{ animationDelay: "0.05s" }}>{t("lineOne")}</span>
          </span>
          <span className="block rise">
            <span
              style={{ animationDelay: "0.18s", color: "var(--champagne-deep)" }}
              className="font-display-italic"
            >
              {t("lineTwo")}
            </span>
          </span>
          <span className="block rise">
            <span style={{ animationDelay: "0.32s" }}>{t("lineThree")}</span>
          </span>
        </h1>

        <p className="text-ink/70 text-[1.06rem] leading-relaxed max-w-md">
          {t("subline")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 sm:items-center">
          <ButtonLink href={primaryBrowseHref} variant="ink" className="group">
            {t("ctaPrimary")}
            <IconArrowRight className="transition-transform group-hover:translate-x-1" />
          </ButtonLink>
          <a
            href={whatsappGeneral(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-ink border-b border-ink/30 hover:border-ink pb-1 self-start sm:self-auto text-[0.95rem] transition-colors"
          >
            <IconWhatsapp size={14} />
            {t("ctaSecondary")}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* Image carousel — full-bleed warm photo, sharp corners. */}
      <div
        className="relative order-1 lg:order-2 aspect-[4/5] lg:aspect-auto lg:min-h-[520px] overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {safeSlides.map((slide, i) => (
          <SlideImage
            key={slide.id}
            slide={slide}
            active={i === index}
            priority={i === 0}
            load={i === index || seen.has(i)}
          />
        ))}

        {safeSlides.length > 1 && (
          <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-ivory/70 backdrop-blur-sm">
            {safeSlides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("showBanner", { current: i + 1, total: safeSlides.length })}
                aria-current={i === index}
                className={cn(
                  "h-[3px] transition-all duration-500",
                  i === index ? "w-7 bg-ink" : "w-3 bg-ink/35 hover:bg-ink/60"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SlideImage({
  slide,
  active,
  priority,
  load,
}: {
  slide: HeroSlide;
  active: boolean;
  priority: boolean;
  /** Only fetch the banner image once it's the active slide (or has been shown).
      Offscreen carousel slides would otherwise all download on first paint —
      heavy on the homepage LCP — because they sit in-viewport behind opacity-0. */
  load: boolean;
}) {
  const mobileSrc = slide.imageMobile ?? slide.imageDesktop;
  const inner = !load ? null : (
    <>
      <Image
        src={ikImage(mobileSrc, { width: 900, format: "auto", quality: 88 })}
        alt={slide.title ?? ""}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="object-cover lg:hidden"
      />
      <Image
        src={ikImage(slide.imageDesktop, { width: 1800, format: "auto", quality: 90 })}
        alt={slide.title ?? ""}
        fill
        priority={priority}
        sizes="55vw"
        className="object-cover hidden lg:block"
      />
    </>
  );

  const wrapperClass = cn(
    "absolute inset-0 transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]",
    active ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
  );
  const wrapperStyle: React.CSSProperties = { transitionDuration: `${FADE_MS}ms` };

  const badge = slide.badgeText ? (
    <span className="absolute top-4 left-4 lg:top-6 lg:left-6 z-[2] bg-ink text-on-ink smallcaps text-[0.6rem] tracking-[0.18em] px-3 py-1.5 shadow-sm pointer-events-none">
      {slide.badgeText}
    </span>
  ) : null;

  // Title + CTA overlay so every banner carries text, not just the badged one.
  const caption = slide.title ? (
    <div className="absolute bottom-0 inset-x-0 z-[2] p-5 lg:p-8 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent pointer-events-none">
      <p className="font-display text-ivory text-[1.7rem] lg:text-[2.4rem] leading-[1.05] drop-shadow">
        {slide.title}
      </p>
      {slide.linkUrl && (
        <span className="mt-2 inline-flex items-center gap-1.5 smallcaps text-[0.62rem] tracking-[0.16em] text-ivory/90">
          Shop now <span aria-hidden="true">→</span>
        </span>
      )}
    </div>
  ) : null;

  if (slide.linkUrl) {
    return (
      <Link
        href={slide.linkUrl}
        className={wrapperClass}
        style={wrapperStyle}
        aria-hidden={!active}
        tabIndex={active ? 0 : -1}
      >
        {inner}
        {badge}
        {caption}
      </Link>
    );
  }

  return (
    <div className={wrapperClass} style={wrapperStyle} aria-hidden={!active}>
      {inner}
      {badge}
      {caption}
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  const ref = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = mq;
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}
