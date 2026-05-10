import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { CategoryStrip } from "@/components/sections/CategoryStrip";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { localize } from "@/lib/supabase/types";
import { getCategories, getCategoryBySlug, getProducts } from "@/lib/data";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProducts({ categoryId: category.id });
  const otherCategories = (await getCategories()).filter((c) => c.id !== category.id);
  const t = await getTranslations("product");
  const localeKey = locale as "en" | "te";
  const name = localize(category, localeKey, "name");
  const description = localize(category, localeKey, "description");
  const banner =
    category.banner_url ?? category.image_url ?? placeholderImage(name, 2400, 1000);

  return (
    <>
      {/* Hero banner */}
      <section className="relative h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden">
        <Image
          src={ikImage(banner, { width: 2200, format: "auto", quality: 88 })}
          alt={name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink/70" />

        <div className="relative h-full flex items-end pb-12 lg:pb-20">
          <Container size="xl">
            <p className="smallcaps text-[0.6rem] text-champagne mb-3">Collection</p>
            <h1 className="font-display text-[2.5rem] sm:text-[4rem] lg:text-[5.5rem] text-ivory leading-none mb-4">
              {name}
            </h1>
            {description && (
              <p className="text-ivory/80 text-[1rem] max-w-md">{description}</p>
            )}
          </Container>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 lg:py-24">
        <Container size="xl">
          <div className="flex justify-between items-center mb-10">
            <p className="text-ink/60 text-sm tabular">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
            <p className="smallcaps text-[0.6rem] text-ink/50">All curated</p>
          </div>

          {products.length > 0 ? (
            <ProductGrid products={products} cols={4} priorityCount={4} />
          ) : (
            <p className="py-16 text-center text-ink/50 font-display text-[1.5rem]">
              {t("noProducts")}
            </p>
          )}
        </Container>
      </section>

      {/* Other collections */}
      {otherCategories.length > 0 && (
        <section className="py-16 lg:py-24 bg-mist-soft border-t border-ink/5">
          <Container size="xl">
            <SectionHeader
              eyebrow="Continue browsing"
              title="Other collections"
              align="left"
            />
            <div className="mt-12">
              <CategoryStrip categories={otherCategories.slice(0, 6)} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
