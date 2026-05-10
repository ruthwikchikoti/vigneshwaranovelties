import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { whatsappGeneral } from "@/lib/whatsapp";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const localeKey = locale as "en" | "te";

  return (
    <Container size="xl" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Reach us</p>
      <h1 className="font-display text-[3rem] lg:text-[4.5rem] text-ink leading-none mb-4">
        {t("title")}
      </h1>
      <p className="text-ink/60 text-[1rem] max-w-md mb-16">{t("subtitle")}</p>

      <div className="grid lg:grid-cols-3 gap-10">
        <ContactCard
          eyebrow={t("whatsappUs")}
          value={site.ownerPhone}
          href={whatsappGeneral(localeKey)}
          icon={<IconWhatsapp size={20} />}
        />
        <ContactCard
          eyebrow={t("callUs")}
          value={site.ownerPhone}
          href={`tel:${site.ownerPhone.replace(/\s/g, "")}`}
        />
        <ContactCard
          eyebrow={t("emailUs")}
          value={site.ownerEmail}
          href={`mailto:${site.ownerEmail}`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-12 mt-20">
        <div>
          <p className="smallcaps text-[0.6rem] text-champagne-deep mb-3">
            {t("address")}
          </p>
          <p className="font-display text-[1.5rem] text-ink leading-snug">
            {site.address.line1}
            <br />
            {site.address.line2}
            <br />
            {site.address.city}
          </p>
        </div>
        <div>
          <p className="smallcaps text-[0.6rem] text-champagne-deep mb-3">
            {t("hours")}
          </p>
          <p className="font-display text-[1.5rem] text-ink leading-snug">
            Mon – Sat
            <br />
            10:00 — 20:00
            <br />
            <span className="text-ink/60">Sundays by appointment</span>
          </p>
        </div>
      </div>
    </Container>
  );
}

function ContactCard({
  eyebrow,
  value,
  href,
  icon,
}: {
  eyebrow: string;
  value: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="group block p-8 border border-ink/10 hover:border-ink transition-colors"
    >
      {icon && <div className="text-champagne-deep mb-4">{icon}</div>}
      <p className="smallcaps text-[0.6rem] text-ink/50">{eyebrow}</p>
      <p className="font-display text-[1.4rem] text-ink mt-1.5 group-hover:text-champagne-deep transition-colors">
        {value}
      </p>
    </a>
  );
}
