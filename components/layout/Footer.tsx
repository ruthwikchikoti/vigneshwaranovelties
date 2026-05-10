import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { site } from "@/lib/site";

export function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");

  return (
    <footer className="bg-ink text-ivory mt-32">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Logo + tagline */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="text-ivory">
              <Logo variant="ivory" size={140} />
            </div>
            <p className="font-display-italic text-2xl lg:text-3xl text-ivory/80 max-w-md leading-tight">
              {t("tagline")}
            </p>
          </div>

          {/* Links */}
          <div className="lg:col-span-2">
            <h3 className="smallcaps text-[0.6rem] text-champagne mb-5">
              {t("explore")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/category/jewelry" className="opacity-70 hover:opacity-100 transition-opacity">
                  {tn("collections")}
                </Link>
              </li>
              <li>
                <Link href="/offers" className="opacity-70 hover:opacity-100 transition-opacity">
                  {tn("offers")}
                </Link>
              </li>
              <li>
                <Link href="/category/silver" className="opacity-70 hover:opacity-100 transition-opacity">
                  Silver
                </Link>
              </li>
              <li>
                <Link href="/category/gift-articles" className="opacity-70 hover:opacity-100 transition-opacity">
                  Gifting
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="smallcaps text-[0.6rem] text-champagne mb-5">
              {t("support")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="opacity-70 hover:opacity-100 transition-opacity">
                  {tn("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="opacity-70 hover:opacity-100 transition-opacity">
                  {tn("contact")}
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${site.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${site.ownerEmail}`}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  Email
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="smallcaps text-[0.6rem] text-champagne mb-5">
              {t("legal")}
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/terms" className="opacity-70 hover:opacity-100 transition-opacity">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="opacity-70 hover:opacity-100 transition-opacity">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-20 mb-8 h-px bg-gradient-to-r from-transparent via-champagne/40 to-transparent" />

        <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-6 text-xs">
          <p className="opacity-50">
            © {new Date().getFullYear()} {site.name}. {t("rights")}
          </p>
          <LanguageSwitcher className="text-ivory" />
          <p className="opacity-50 smallcaps text-[0.6rem]">
            {site.address.line2}, {site.address.city}
          </p>
        </div>
      </div>
    </footer>
  );
}
