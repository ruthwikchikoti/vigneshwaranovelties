import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { getCmsPage } from "@/lib/admin/cms";
import { pickCmsTitle, pickCmsBody, renderCmsBody } from "@/lib/cms-render";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");
  const cms = await getCmsPage("terms");
  const cmsTitle = pickCmsTitle(cms, locale as "en" | "te");
  const cmsBody = pickCmsBody(cms, locale as "en" | "te");

  return (
    <Container size="md" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">{t("eyebrow")}</p>
      <h1 className="font-display text-[2.75rem] lg:text-[4rem] text-ink leading-tight mb-12">
        {cmsTitle ?? t("title")}
      </h1>
      <div className="prose-legal">
        {cmsBody ? (
          renderCmsBody(cmsBody)
        ) : (
          <>
            <p>{t("intro", { name: site.name })}</p>
            <h2>{t("cartHeading")}</h2>
            <p>{t("cartBody")}</p>
            <h2>{t("mtoHeading")}</h2>
            <p>{t("mtoBody")}</p>
            <h2>{t("returnsHeading")}</h2>
            <p>{t("returnsBody")}</p>
            <h2>{t("qualityHeading")}</h2>
            <p>{t("qualityBody")}</p>
            <h2>{t("contactHeading")}</h2>
            <p>{t("contactBody", { phone: site.ownerPhone, phoneAlt: site.ownerPhoneAlt, email: site.ownerEmail })}</p>
          </>
        )}
      </div>

      <style>{`
        .prose-legal { color: rgba(15,14,12,0.78); }
        .prose-legal p { line-height: 1.8; margin-bottom: 1.25rem; }
        .prose-legal h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--ink);
          margin-top: 2.5rem;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </Container>
  );
}
