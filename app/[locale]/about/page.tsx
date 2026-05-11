import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ikImage } from "@/lib/imagekit";
import { IconArrowRight } from "@/components/ui/Icons";
import { getCmsPage } from "@/lib/admin/cms";
import { pickCmsTitle, pickCmsBody, renderCmsBody } from "@/lib/cms-render";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const cms = await getCmsPage("about");
  const cmsTitle = pickCmsTitle(cms, locale as "en" | "te");
  const cmsBody = pickCmsBody(cms, locale as "en" | "te");

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
                {cmsTitle ?? t("title")}
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
          src={ikImage(
            cms?.image_url ?? "https://picsum.photos/seed/vn-storefront/2400/1200",
            { width: 2400 }
          )}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <section className="py-20 lg:py-28">
        <Container size="md">
          <div className="prose-vn">
            {cmsBody ? (
              renderCmsBody(cmsBody)
            ) : (
              <>
                <p>
                  Vigneshwara Novelties is a family-run showroom in Cherial, Telangana —
                  with more than 20 years in the business. One simple idea has stayed
                  with us all this time: beautiful jewelry and gifts should be friendly to
                  buy, not intimidating.
                </p>
                <p>
                  We stock <strong>1-gram gold jewelry</strong>, <strong>German silver</strong>{" "}
                  pieces, <strong>pulse chains</strong>, and a wide range of{" "}
                  <strong>gift articles</strong> for festivals, weddings, birthdays and
                  every small moment in between. Everything is hand-picked and priced fairly
                  — and our family is on the other end of every WhatsApp message.
                </p>
                <p className="font-display-italic text-[1.5rem] text-ink mt-12 mb-12 leading-snug">
                  &quot;Pretty things, simple to buy. That&apos;s it.&quot;
                </p>
                <p>
                  Whether you&apos;re looking for a gift for your sister&apos;s wedding, a chain for
                  everyday wear, or something special for a festival — come visit our
                  showroom on Cherial Road, or send us a WhatsApp. We&apos;re open all 7 days,
                  10 AM to 8 PM.
                </p>
              </>
            )}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <ButtonLink href="/category/1gram-gold" variant="ink">
              See Collections
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
        .prose-vn strong { color: var(--ink); font-weight: 500; }
      `}</style>
    </>
  );
}
