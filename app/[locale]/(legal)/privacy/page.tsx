import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container size="md" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Legal</p>
      <h1 className="font-display text-[2.75rem] lg:text-[4rem] text-ink leading-tight mb-12">
        Privacy Policy
      </h1>
      <div className="prose-legal">
        <p>
          We respect your privacy. Vigneshwara Novelties collects only what we need
          to contact you about your inquiry — name, mobile number, optional address
          and message.
        </p>
        <h2>What we collect</h2>
        <p>
          When you submit an inquiry: your name, mobile number, optional address and
          message. When you browse: anonymous usage analytics (Google Analytics).
        </p>
        <h2>How we use it</h2>
        <p>
          To contact you about your inquiry. We never sell your data, and we do not
          send marketing messages unless you explicitly opt in.
        </p>
        <h2>Storage</h2>
        <p>
          Inquiry data is stored securely in our Supabase backend and accessed only by
          authorized family members of the store.
        </p>
        <h2>Removal</h2>
        <p>
          Want your data removed? WhatsApp +91 98667 77053 or email and we'll delete it
          within 24 hours.
        </p>
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
