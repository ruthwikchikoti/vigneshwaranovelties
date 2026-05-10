"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { useCart } from "@/lib/cart-store";
import { whatsappGeneral } from "@/lib/whatsapp";
import {
  IconHome,
  IconSearch,
  IconBag,
  IconUser,
} from "@/components/ui/Icons";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const locale = useLocale() as "en" | "te";
  const pathname = usePathname();
  const cartCount = useCart((s) => s.count());

  const isActive = (href: string) => pathname === href;

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ivory/95 backdrop-blur border-t border-ink/10 safe-bottom">
      <ul className="grid grid-cols-5 h-[60px]">
        <li>
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-full text-ink transition-colors",
              isActive("/") ? "text-champagne-deep" : "text-ink"
            )}
          >
            <IconHome size={20} />
            <span className="text-[0.55rem] smallcaps tracking-[0.15em]">
              {t("home")}
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/category/jewelry"
            className="flex flex-col items-center justify-center gap-0.5 h-full text-ink"
          >
            <IconSearch size={20} />
            <span className="text-[0.55rem] smallcaps tracking-[0.15em]">
              {t("shop")}
            </span>
          </Link>
        </li>
        <li>
          <a
            href={whatsappGeneral(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 h-full bg-champagne text-ink mx-1 my-2 rounded-sm shadow-sm"
          >
            <IconWhatsapp size={20} />
            <span className="text-[0.55rem] smallcaps tracking-[0.15em]">
              Chat
            </span>
          </a>
        </li>
        <li>
          <Link
            href="/cart"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-full text-ink relative",
              isActive("/cart") && "text-champagne-deep"
            )}
          >
            <span className="relative">
              <IconBag size={20} />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-2 bg-cognac text-ivory text-[0.5rem] font-medium rounded-full min-w-3.5 h-3.5 px-1 flex items-center justify-center tabular">
                  {cartCount}
                </span>
              ) : null}
            </span>
            <span className="text-[0.55rem] smallcaps tracking-[0.15em]">
              {t("cart")}
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/contact"
            className="flex flex-col items-center justify-center gap-0.5 h-full text-ink"
          >
            <IconUser size={20} />
            <span className="text-[0.55rem] smallcaps tracking-[0.15em]">
              {t("contact")}
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
