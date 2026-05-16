"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { Seal } from "@/components/brand/Seal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { IconSearch, IconBag, IconMenu, IconClose } from "@/components/ui/Icons";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { whatsappGeneral } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * Compact EN/TE toggle for the mobile header bar. Most customers in Cherial
 * are Telugu-first, so the language switch needs to be one tap away — not
 * buried in the hamburger menu.
 */
/**
 * Compact dual-label EN | తె toggle for the mobile header bar.
 * Shows both languages with the active one filled — visitors immediately
 * see Telugu is available without needing a tooltip or opening a menu.
 */
function MobileLocaleToggle({ currentLocale }: { currentLocale: "en" | "te" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: "en" | "te" = currentLocale === "en" ? "te" : "en";
  const aria = next === "te" ? "Switch to Telugu" : "Switch to English";

  const cellClass = (isActive: boolean) =>
    cn(
      "px-2 py-1 text-[0.7rem] leading-none transition-colors",
      isActive ? "bg-ink text-on-ink" : "text-ink/55"
    );

  return (
    <button
      type="button"
      aria-label={aria}
      disabled={pending}
      onClick={() =>
        startTransition(() => router.replace(pathname, { locale: next }))
      }
      className={cn(
        "inline-flex items-stretch border border-ink/20 overflow-hidden rounded-sm transition-opacity",
        pending && "opacity-50"
      )}
    >
      <span className={cellClass(currentLocale === "en")}>EN</span>
      <span
        className={cn(
          cellClass(currentLocale === "te"),
          "border-l border-ink/15",
          "font-display"
        )}
      >
        తె
      </span>
    </button>
  );
}

function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

type HeaderProps = {
  announcement?: { text_en: string; text_te: string; enabled: boolean };
};

export function Header({ announcement }: HeaderProps = {}) {
  const t = useTranslations("nav");
  const locale = useLocale() as "en" | "te";
  const cartCount = useCart((s) => s.count());
  const wishlistCount = useWishlist((s) => s.count());
  const [mountedClient, setMountedClient] = useState(false);
  useEffect(() => setMountedClient(true), []);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Three links each side, mirroring the design system header (Jewelry / Silver /
  // Watches  ◇  Gift Articles / Festive Edit / About).
  const leftLinks = [
    { href: "/shop", label: t("shopAll") },
    { href: "/category/1gram-gold", label: t("collections") },
    { href: "/category/german-silver", label: t("silver") },
    { href: "/category/gift-articles", label: t("gifting") },
  ];
  const rightLinks = [
    { href: "/offers", label: t("offers") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];
  const allLinks = [...leftLinks, ...rightLinks];

  return (
    <>
      {/* Thin announce bar — navy ink panel, tracked caps. Editable from /admin/settings.
          Locale-aware: Telugu visitors see text_te if present, otherwise the English copy. */}
      {(() => {
        if (!announcement?.enabled) return null;
        const announceText =
          locale === "te" && announcement.text_te
            ? announcement.text_te
            : announcement.text_en;
        if (!announceText) return null;
        return (
          <div
            className={cn(
              "bg-ink-panel text-on-ink-2 text-[0.66rem] text-center py-2 px-4 font-medium",
              // Telugu doesn't use letter-case — drop uppercase + tight tracking when rendering te.
              locale === "te"
                ? "tracking-normal"
                : "tracking-[0.18em] uppercase"
            )}
          >
            {announceText}
          </div>
        );
      })()}

      <header
        className={cn(
          "sticky top-0 inset-x-0 z-40 transition-[background,backdrop-filter,border-color] duration-300",
          scrolled
            ? "bg-ivory/85 backdrop-blur-md saturate-150 border-b border-ink/12"
            : "bg-ivory/65 border-b border-transparent"
        )}
      >
        <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-12">
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-8 h-[80px] lg:h-[100px]">
            {/* Left — mobile menu trigger / desktop nav */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 -ml-2 text-ink justify-self-start"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>

            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 justify-self-start">
              {leftLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="smallcaps text-[0.7rem] text-ink/85 hover:text-ink transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Center — circular seal */}
            <Link href="/" className="justify-self-center flex items-center gap-2" aria-label="Vigneshwara Novelties">
              <span className="lg:hidden">
                <Seal size={60} priority />
              </span>
              <span className="hidden lg:block">
                <Seal size={80} priority />
              </span>
            </Link>

            {/* Right — desktop nav + icons / mobile icons */}
            <nav className="hidden lg:flex items-center gap-7 justify-self-end">
              {rightLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="smallcaps text-[0.7rem] text-ink/85 hover:text-ink transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <span className="w-px h-5 bg-ink/15" aria-hidden="true" />
              <Link
                href="/search"
                className="p-2 text-ink/80 hover:text-ink"
                aria-label={t("search")}
              >
                <IconSearch />
              </Link>
              <Link
                href="/wishlist"
                className="relative p-2 text-ink/80 hover:text-ink"
                aria-label="Saved pieces"
              >
                <HeartIcon />
                {mountedClient && wishlistCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 bg-vermilion text-on-ink text-[0.55rem] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular">
                    {wishlistCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/cart"
                className="relative p-2 text-ink/80 hover:text-ink"
                aria-label={t("cart")}
              >
                <IconBag />
                {mountedClient && cartCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 bg-champagne text-ink text-[0.55rem] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
              <LanguageSwitcher />
            </nav>

            <div className="flex items-center gap-1 lg:hidden justify-self-end">
              <MobileLocaleToggle currentLocale={locale} />
              <Link
                href="/cart"
                className="relative p-2 text-ink"
                aria-label={t("cart")}
              >
                <IconBag />
                {mountedClient && cartCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 bg-champagne text-ink text-[0.55rem] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-ivory shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between p-6 border-b border-ink/10">
            <Seal size={44} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 text-ink"
              aria-label="Close menu"
            >
              <IconClose />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-6 flex flex-col gap-1">
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display text-[1.5rem] py-3 border-b border-ink/5 text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="p-6 border-t border-ink/10 flex items-center justify-between">
            <LanguageSwitcher />
            <a
              href={whatsappGeneral(locale)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-base btn-whatsapp text-[0.65rem]"
            >
              <IconWhatsapp size={14} />
              {t("whatsapp")}
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
