import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Seal } from "@/components/brand/Seal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { site } from "@/lib/site";

export function Footer() {
  const tn = useTranslations("nav");

  return (
    <footer className="bg-ink-panel text-on-ink-2 mt-24 lg:mt-32">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
        <div className="grid lg:grid-cols-[1.2fr_2fr] gap-12 lg:gap-16 pb-12 lg:pb-16 border-b border-white/8">
          {/* Brand block — seal at 96px, italic description */}
          <div className="flex flex-col gap-5 items-start">
            <Seal size={96} className="opacity-95" />
            <p className="text-sm leading-relaxed max-w-sm text-on-ink-2">
              A jewelry and gift articles boutique. Visit our showroom in Cherial,
              or browse the collections and request a piece online.
            </p>
          </div>

          {/* Three columns of links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 lg:gap-12">
            <div>
              <h3 className="smallcaps text-[0.62rem] text-champagne mb-5">Shop</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/category/1gram-gold" className="opacity-80 hover:opacity-100 transition-opacity">{tn("collections")}</Link></li>
                <li><Link href="/category/german-silver" className="opacity-80 hover:opacity-100 transition-opacity">Silver Items</Link></li>
                <li><Link href="/category/gift-articles" className="opacity-80 hover:opacity-100 transition-opacity">Gift Articles</Link></li>
                <li><Link href="/offers" className="opacity-80 hover:opacity-100 transition-opacity">{tn("offers")}</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="smallcaps text-[0.62rem] text-champagne mb-5">The store</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/about" className="opacity-80 hover:opacity-100 transition-opacity">{tn("about")}</Link></li>
                <li><Link href="/contact" className="opacity-80 hover:opacity-100 transition-opacity">Visit us</Link></li>
                <li><Link href="/contact" className="opacity-80 hover:opacity-100 transition-opacity">{tn("contact")}</Link></li>
                <li><Link href="/faq" className="opacity-80 hover:opacity-100 transition-opacity">FAQ</Link></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h3 className="smallcaps text-[0.62rem] text-champagne mb-5">Reach us</h3>
              <ul className="space-y-3 text-sm">
                <li><a href={`tel:${site.ownerPhone.replace(/\s+/g, "")}`} className="opacity-80 hover:opacity-100 transition-opacity">{site.ownerPhone}</a></li>
                <li><a href={`mailto:${site.ownerEmail}`} className="opacity-80 hover:opacity-100 transition-opacity">{site.ownerEmail}</a></li>
                <li className="opacity-80">{site.address.line2}</li>
                <li className="opacity-80">{site.address.city}</li>
                <li className="opacity-80">{site.hours.label} · {site.hours.range}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between items-center gap-6 text-xs text-on-ink-2/70">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <LanguageSwitcher className="text-on-ink" />
          <p className="smallcaps text-[0.6rem] tracking-[0.18em] text-center sm:text-right">
            <Link href="/privacy" className="hover:opacity-100">Privacy</Link>
            &nbsp;·&nbsp;
            <Link href="/terms" className="hover:opacity-100">Terms</Link>
            &nbsp;·&nbsp;
            Crafted in Cherial
          </p>
        </div>
      </div>
    </footer>
  );
}
