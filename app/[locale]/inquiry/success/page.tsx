import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { whatsappAfterInquiry } from "@/lib/whatsapp";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { CartClearer } from "@/components/cart/CartClearer";
import { site } from "@/lib/site";

export default async function InquirySuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ queued?: string }>;
}) {
  const { locale } = await params;
  const { queued } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("inquiry");
  const localeKey = locale as "en" | "te";
  const isQueued = queued === "1";

  return (
    <Container size="md" className="py-20 lg:py-32 text-center">
      <CartClearer />
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-champagne/20 grid place-items-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--champagne-deep)" strokeWidth="2" strokeLinecap="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p className="smallcaps text-[0.65rem] text-champagne-deep">{isQueued ? t("statusSaved") : t("statusSent")}</p>
        <h1 className="font-display text-[2.5rem] lg:text-[3.5rem] text-ink leading-tight">
          {t("success")}
        </h1>
        <div className="divider-gold w-20" />
        <p className="text-ink/70 text-[1rem] leading-relaxed">{isQueued ? t("queued") : t("successDetail")}</p>

        <p className="text-ink/60 text-sm max-w-md">
          For the fastest reply, send us a quick WhatsApp now — we&apos;ll match it to your
          inquiry and confirm details.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href={whatsappAfterInquiry(localeKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-whatsapp"
          >
            <IconWhatsapp size={14} />
            Confirm on WhatsApp
          </a>
          <ButtonLink href="/" variant="ghost">
            {t("backHome")}
          </ButtonLink>
        </div>

        <p className="text-xs text-ink/40 mt-4 tabular">
          Or call {site.ownerPhone}
        </p>
      </div>
    </Container>
  );
}
