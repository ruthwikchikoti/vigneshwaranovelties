"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Monogram } from "@/components/brand/Monogram";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { IconSearch, IconBag, IconMenu, IconClose } from "@/components/ui/Icons";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { useCart } from "@/lib/cart-store";
import { whatsappGeneral } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale() as "en" | "te";
  const cartCount = useCart((s) => s.count());
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

  const links = [
    { href: "/category/jewelry", label: t("collections") },
    { href: "/offers", label: t("offers") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-500",
          scrolled
            ? "bg-ivory/95 backdrop-blur-md border-b border-ink/5"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden p-2 -ml-2 text-ink"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>

            <nav className="hidden lg:flex items-center gap-10 flex-1">
              {links.slice(0, 2).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="smallcaps text-[0.7rem] text-ink hover:text-champagne-deep transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 group"
              aria-label="Vigneshwara Novelties"
            >
              <Monogram size={36} variant="ink" />
              <span className="hidden sm:inline-flex flex-col leading-none">
                <span className="font-display text-[1.1rem] tracking-tight text-ink">
                  Vigneshwara
                </span>
                <span className="smallcaps text-[0.55rem] text-champagne-deep mt-0.5">
                  Novelties
                </span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-10 flex-1 justify-end">
              {links.slice(2).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="smallcaps text-[0.7rem] text-ink hover:text-champagne-deep transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <LanguageSwitcher />
            </nav>

            <div className="flex items-center gap-1 lg:hidden">
              <a
                href={whatsappGeneral(locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-ink"
                aria-label={t("whatsapp")}
              >
                <IconWhatsapp />
              </a>
              <Link
                href="/cart"
                className="relative p-2 text-ink"
                aria-label={t("cart")}
              >
                <IconBag />
                {cartCount > 0 ? (
                  <span className="absolute top-0.5 right-0.5 bg-champagne text-ink text-[0.55rem] font-medium rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-1 ml-6">
              <button className="p-2 text-ink" aria-label={t("search")}>
                <IconSearch />
              </button>
              <Link
                href="/cart"
                className="relative p-2 text-ink"
                aria-label={t("cart")}
              >
                <IconBag />
                {cartCount > 0 ? (
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
            <Monogram size={36} />
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
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display text-[1.5rem] py-3 border-b border-ink/5 text-ink"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/category/silver"
              onClick={() => setOpen(false)}
              className="font-display text-[1.5rem] py-3 border-b border-ink/5 text-ink"
            >
              Silver
            </Link>
            <Link
              href="/category/gift-articles"
              onClick={() => setOpen(false)}
              className="font-display text-[1.5rem] py-3 border-b border-ink/5 text-ink"
            >
              Gifting
            </Link>
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
