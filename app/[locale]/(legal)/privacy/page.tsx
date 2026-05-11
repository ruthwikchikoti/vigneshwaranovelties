import { setRequestLocale } from "next-intl/server";
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
  const cms = await getCmsPage("privacy");
  const cmsTitle = pickCmsTitle(cms, locale as "en" | "te");
  const cmsBody = pickCmsBody(cms, locale as "en" | "te");

  return (
    <Container size="md" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Legal</p>
      <h1 className="font-display text-[2.75rem] lg:text-[4rem] text-ink leading-tight mb-12">
        {cmsTitle ?? "Privacy Policy"}
      </h1>
      <div className="prose-legal">
        {cmsBody ? (
          renderCmsBody(cmsBody)
        ) : (
          <>
            <p>
              We respect your privacy. {site.name} only collects what we need to call you
              back — your name, mobile number, and optional address.
            </p>
            <h2>What we collect</h2>
            <p>
              When you place an order: your name, mobile number, and optional address and
              notes. When you browse: anonymous usage stats.
            </p>
            <h2>How we use it</h2>
            <p>
              To call or WhatsApp you about your order. We do not sell your data and we do
              not send marketing messages without your permission.
            </p>
            <h2>Where it lives</h2>
            <p>
              Your details are stored securely with our backend (Supabase) and accessed
              only by our family.
            </p>
            <h2>Want it removed?</h2>
            <p>
              WhatsApp {site.ownerPhone} or email {site.ownerEmail} and we&apos;ll remove your
              details within 24 hours.
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
