import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/sections/Hero";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { CategoryStrip } from "@/components/sections/CategoryStrip";
import { OffersBand } from "@/components/sections/OffersBand";
import { Editorial } from "@/components/sections/Editorial";
import {
  getBanners,
  getCategories,
  getOffers,
  getProducts,
} from "@/lib/data";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [banners, categories, featured, trending, newArrivals, offers] = await Promise.all([
    getBanners("hero"),
    getCategories(),
    getProducts({ featured: true, limit: 4 }),
    getProducts({ trending: true, limit: 8 }),
    getProducts({ newArrival: true, limit: 4 }),
    getOffers(),
  ]);

  const t = await getTranslations("sections");
  const heroBanner = banners[0];
  const heroDesktop =
    heroBanner?.desktop_image_url ?? "https://picsum.photos/seed/vn-hero/2000/1200";
  const heroMobile =
    heroBanner?.mobile_image_url ?? "https://picsum.photos/seed/vn-hero/1080/1440";

  return (
    <>
      <Hero imageDesktop={heroDesktop} imageMobile={heroMobile} />

      {/* Featured */}
      <section className="py-20 lg:py-32">
        <Container size="xl">
          <SectionHeader
            eyebrow="Curated"
            title={t("featured")}
            subtitle={t("featuredSub")}
            href="/category/jewelry"
            hrefLabel="View all"
          />
          <div className="mt-12 lg:mt-16">
            <ProductGrid products={featured} cols={4} priorityCount={2} />
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-20 lg:py-28 bg-mist-soft">
        <Container size="xl">
          <SectionHeader
            eyebrow="Showroom"
            title={t("categories")}
            subtitle={t("categoriesSub")}
            href="/category/jewelry"
            hrefLabel="All collections"
          />
          <div className="mt-12 lg:mt-16">
            <CategoryStrip categories={categories.slice(0, 6)} />
          </div>
        </Container>
      </section>

      {/* Offers */}
      <section className="py-20 lg:py-28">
        <Container size="xl">
          <SectionHeader
            eyebrow="This week"
            title={t("offers")}
            subtitle={t("offersSub")}
            href="/offers"
          />
          <div className="mt-12 lg:mt-16">
            <OffersBand offers={offers} />
          </div>
        </Container>
      </section>

      {/* Editorial moment */}
      <section className="py-20 lg:py-32 bg-ink text-ivory">
        <Container size="xl">
          <Editorial
            eyebrow="The atelier"
            title="Three generations. One steady hand."
            body="Vigneshwara Novelties began in 1998 as a single counter in our village bazaar. Today our family curates pieces from the most discreet workshops in Hyderabad and Vizag — handing each one to you with the same care, in person or online."
            imageUrl="https://picsum.photos/seed/vn-atelier/1200/1500"
            ctaLabel="Our story"
            ctaHref="/about"
            reverse
          />
        </Container>
      </section>

      {/* Trending */}
      <section className="py-20 lg:py-32">
        <Container size="xl">
          <SectionHeader
            eyebrow="Most loved"
            title={t("trending")}
            subtitle={t("trendingSub")}
            href="/category/jewelry"
            hrefLabel="View all"
          />
          <div className="mt-12 lg:mt-16">
            <ProductGrid products={trending} cols={4} />
          </div>
        </Container>
      </section>

      {/* New arrivals */}
      <section className="py-20 lg:py-28 bg-mist-soft">
        <Container size="xl">
          <SectionHeader
            eyebrow="Just in"
            title={t("newArrivals")}
            subtitle={t("newArrivalsSub")}
            href="/category/jewelry"
            hrefLabel="See all"
          />
          <div className="mt-12 lg:mt-16">
            <ProductGrid products={newArrivals} cols={4} />
          </div>
        </Container>
      </section>
    </>
  );
}
