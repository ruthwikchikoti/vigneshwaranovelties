import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";

export default async function TermsPage({
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
        Terms & Conditions
      </h1>
      <div className="prose-legal">
        <p>
          By using vigneshwaranovelties.com, you agree to the following terms.
          Vigneshwara Novelties is an inquiry-based digital showroom — we do not process
          payments online.
        </p>
        <h2>1. Inquiries & pricing</h2>
        <p>
          Prices shown are indicative and may vary based on current gold/silver rates,
          customization, or making charges. Final pricing is confirmed by our team
          when we contact you.
        </p>
        <h2>2. Made-to-order pieces</h2>
        <p>
          Some pieces are made to order. Lead times typically range 2–4 weeks. We will
          confirm before any commitment is made.
        </p>
        <h2>3. Returns & exchanges</h2>
        <p>
          Returns and exchanges are handled in person at our showroom, or via courier
          within 7 days of delivery. Custom pieces are non-returnable.
        </p>
        <h2>4. Authenticity</h2>
        <p>
          All gold pieces are BIS-hallmarked. Silver is 925 sterling. Original
          certificates are provided with every purchase.
        </p>
        <h2>5. Contact</h2>
        <p>For any questions, WhatsApp us at +91 98667 77053.</p>
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
