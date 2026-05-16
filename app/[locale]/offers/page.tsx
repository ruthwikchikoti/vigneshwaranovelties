import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { OffersBand } from "@/components/sections/OffersBand";
import { getCategories, getOffers } from "@/lib/data";

export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("offers");
  const [offers, categories] = await Promise.all([getOffers(), getCategories()]);

  return (
    <Container size="xl" className="py-16 lg:py-28">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">{t("eyebrow")}</p>
      <h1 className="font-display text-[2.25rem] sm:text-[3rem] lg:text-[4.5rem] text-ink leading-tight mb-4">
        {t("title")}
      </h1>
      <p className="text-ink/60 text-[1rem] max-w-md mb-12 lg:mb-16">{t("subtitle")}</p>
      <OffersBand offers={offers} categories={categories} />
    </Container>
  );
}
