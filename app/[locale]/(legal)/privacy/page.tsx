import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { getCmsPage } from "@/lib/admin/cms";
import { pickCmsTitle, pickCmsBody, renderCmsBody } from "@/lib/cms-render";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const cms = await getCmsPage("privacy");
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
            <p>{t("body1", { name: site.name })}</p>
            <h2>{t("collectHeading")}</h2>
            <p>{t("collectBody")}</p>
            <h2>{t("useHeading")}</h2>
            <p>{t("useBody")}</p>
            <h2>{t("storeHeading")}</h2>
            <p>{t("storeBody")}</p>
            <h2>{t("removeHeading")}</h2>
            <p>{t("removeBody", { phone: site.ownerPhone, email: site.ownerEmail })}</p>
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
