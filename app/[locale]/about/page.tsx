import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ikImage } from "@/lib/imagekit";
import { IconArrowRight } from "@/components/ui/Icons";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <>
      <section className="relative pt-12 lg:pt-20 pb-16 lg:pb-24">
        <Container size="xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-7">
              <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">
                Our story
              </p>
              <h1 className="font-display text-[2.75rem] sm:text-[4rem] lg:text-[5.5rem] text-ink leading-[0.95]">
                {t("title")}
              </h1>
            </div>
            <div className="lg:col-span-5">
              <p className="font-display-italic text-[1.4rem] lg:text-[1.6rem] leading-snug text-ink/80">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="relative aspect-[16/8] sm:aspect-[16/6]">
        <Image
          src={ikImage("https://picsum.photos/seed/vn-storefront/2400/1200", { width: 2400 })}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <section className="py-20 lg:py-28">
        <Container size="md">
          <div className="prose-vn">
            <p>
              In 1998, our grandfather opened a single counter in the village bazaar
              with one shelf of silver pooja sets and a small ledger. He believed that
              jewelry and gifting were not transactions — they were the markers of
              every meaningful moment in a family's life.
            </p>
            <p>
              Twenty-six years later, three generations later, that belief still anchors
              us. We curate from the most discreet workshops in Hyderabad, Vizag and
              Chennai — temple jewelry, kundan, antique gold, 925 silver — and we
              bring them to our village & beyond, in person and now online.
            </p>
            <p className="font-display-italic text-[1.5rem] text-ink mt-12 mb-12 leading-snug">
              "We don't sell pieces. We help you mark moments."
            </p>
            <p>
              Whether you're choosing a chandbali for your daughter's wedding, a
              silver lamp for the new house, or a small gift for an old friend — our
              family is on the other side of the WhatsApp message, picking up the call
              the same way our grandfather did. Personally.
            </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <ButtonLink href="/category/jewelry" variant="ink">
              Browse Collections
              <IconArrowRight />
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              Visit our showroom
            </ButtonLink>
          </div>
        </Container>
      </section>

      <style>{`
        .prose-vn p { color: rgba(15,14,12,0.78); font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.5rem; }
      `}</style>
    </>
  );
}
