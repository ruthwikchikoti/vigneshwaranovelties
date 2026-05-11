import { setRequestLocale } from "next-intl/server";
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
  const cms = await getCmsPage("terms");
  const cmsTitle = pickCmsTitle(cms, locale as "en" | "te");
  const cmsBody = pickCmsBody(cms, locale as "en" | "te");

  return (
    <Container size="md" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Legal</p>
      <h1 className="font-display text-[2.75rem] lg:text-[4rem] text-ink leading-tight mb-12">
        {cmsTitle ?? "Terms & Conditions"}
      </h1>
      <div className="prose-legal">
        {cmsBody ? (
          renderCmsBody(cmsBody)
        ) : (
          <>
            <p>
              By using {site.name}, you agree to the simple terms below. We&apos;re a
              family-run shop in Cherial — these terms are written in plain English so
              everyone understands.
            </p>
            <h2>1. Cart &amp; pricing</h2>
            <p>
              Prices on our site are indicative. Final price is confirmed by our team
              when we call or message you back. We do not take payments online — every
              order is followed up personally by our family.
            </p>
            <h2>2. Made-to-order pieces</h2>
            <p>
              Some pieces are made on order. We&apos;ll tell you the time needed when we
              confirm your order — usually 1 to 2 weeks.
            </p>
            <h2>3. Returns &amp; exchanges</h2>
            <p>
              You can return or exchange unused items within 7 days at our showroom in
              Cherial. Customised pieces and used items can&apos;t be returned.
            </p>
            <h2>4. Quality</h2>
            <p>
              We sell 1-gram gold jewelry, German silver, pulse chains and gift articles.
              We&apos;re upfront about every piece&apos;s material and finish. Ask us anything before
              you order — we&apos;ll explain.
            </p>
            <h2>5. Contact</h2>
            <p>
              For any question: WhatsApp {site.ownerPhone} or call {site.ownerPhoneAlt}.
              Email {site.ownerEmail}.
            </p>
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
