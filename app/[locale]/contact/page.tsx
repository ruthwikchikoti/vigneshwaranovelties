import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { whatsappGeneral } from "@/lib/whatsapp";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { getCmsPage } from "@/lib/admin/cms";
import { pickCmsTitle, pickCmsBody } from "@/lib/cms-render";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const localeKey = locale as "en" | "te";
  const cms = await getCmsPage("contact");
  const cmsTitle = pickCmsTitle(cms, localeKey);
  const cmsBody = pickCmsBody(cms, localeKey);

  return (
    <Container size="xl" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Reach us</p>
      <h1 className="font-display text-[2.25rem] sm:text-[3rem] lg:text-[4.5rem] text-ink leading-tight mb-4">
        {cmsTitle ?? t("title")}
      </h1>
      <p className="text-ink/60 text-[1rem] max-w-xl mb-16 whitespace-pre-line">
        {cmsBody ?? t("subtitle")}
      </p>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <ContactCard
          eyebrow={t("whatsappUs")}
          value={site.ownerPhone}
          href={whatsappGeneral(localeKey)}
          icon={<IconWhatsapp size={20} />}
        />
        <ContactCard
          eyebrow={t("callUs")}
          value={site.ownerPhone}
          subValue={site.ownerPhoneAlt}
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
          <p className="font-display text-[1.4rem] lg:text-[1.5rem] text-ink leading-snug">
            {site.address.line1}
            <br />
            {site.address.line2}
            <br />
            {site.address.line3}
            <br />
            {site.address.city}
          </p>
        </div>
        <div>
          <p className="smallcaps text-[0.6rem] text-champagne-deep mb-3">
            {t("hours")}
          </p>
          <p className="font-display text-[1.4rem] lg:text-[1.5rem] text-ink leading-snug">
            {site.hours.label}
            <br />
            {site.hours.range}
          </p>
        </div>
      </div>
    </Container>
  );
}

function ContactCard({
  eyebrow,
  value,
  subValue,
  href,
  icon,
}: {
  eyebrow: string;
  value: string;
  subValue?: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="group block p-6 lg:p-8 border border-ink/10 hover:border-ink transition-colors"
    >
      {icon && <div className="text-champagne-deep mb-4">{icon}</div>}
      <p className="smallcaps text-[0.6rem] text-ink/50">{eyebrow}</p>
      <p className="font-display text-[1.05rem] sm:text-[1.25rem] lg:text-[1.4rem] text-ink mt-1.5 group-hover:text-champagne-deep transition-colors break-all">
        {value}
      </p>
      {subValue ? (
        <p className="font-display text-[1.1rem] text-ink/60 mt-1">{subValue}</p>
      ) : null}
    </a>
  );
}
