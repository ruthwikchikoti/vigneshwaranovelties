import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { getCmsPage } from "@/lib/admin/cms";
import { pickCmsTitle, pickCmsBody, parseFaq, renderCmsBody } from "@/lib/cms-render";
import { site } from "@/lib/site";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return { title: t("metaTitle") };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const localeKey = locale as "en" | "te";
  const t = await getTranslations("faq");
  const cms = await getCmsPage("faq");
  const cmsTitle = pickCmsTitle(cms, localeKey);
  const cmsBody = pickCmsBody(cms, localeKey);

  const bodyText = cmsBody ?? "";
  const parsed = parseFaq(bodyText);
  const items = parsed.length > 0 ? parsed : null;
  const hasContent = Boolean(items || bodyText.trim());

  return (
    <Container size="md" className="py-16 lg:py-24">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">{t("eyebrow")}</p>
      <h1 className="font-display text-[2.5rem] lg:text-[3.75rem] text-ink leading-tight mb-10">
        {cmsTitle ?? t("title")}
      </h1>

      {!hasContent ? (
        <p className="text-ink/65 text-[1.02rem] leading-relaxed max-w-lg">
          {t("empty")}
        </p>
      ) : items ? (
        <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
          {items.map((it, i) => (
            <li key={i}>
              <details className="group py-5 lg:py-6">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-6 hover:text-champagne-deep transition-colors">
                  <span className="font-display text-[1.15rem] lg:text-[1.35rem] text-ink leading-snug pr-4">
                    {it.question}
                  </span>
                  <span className="flex-shrink-0 w-6 h-6 grid place-items-center border border-ink/20 group-open:rotate-45 transition-transform">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M6 1v10M1 6h10" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-3 lg:mt-4 pr-12 text-ink/72 leading-relaxed text-[0.96rem] whitespace-pre-line">
                  {it.answer}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <div className="prose-vn">{renderCmsBody(bodyText)}</div>
      )}

      <div className="mt-12 lg:mt-16 p-6 lg:p-8 bg-mist-soft border border-ink/10">
        <p className="font-display text-[1.4rem] text-ink mb-2">
          {t("noAnswerTitle")}
        </p>
        <p className="text-sm text-ink/65 mb-4 max-w-md">
          {t("noAnswerBody")}
        </p>
        <a
          href={`https://wa.me/${site.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-base btn-whatsapp"
        >
          {t("whatsappCta")}
        </a>
      </div>

      <style>{`
        .prose-vn p { color: rgba(15,14,12,0.78); font-size: 1rem; line-height: 1.75; margin-bottom: 1.5rem; }
      `}</style>
    </Container>
  );
}
