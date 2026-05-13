import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/sections/Hero";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { RecentlyViewedStrip } from "@/components/product/RecentlyViewedStrip";
import { CategoryStrip } from "@/components/sections/CategoryStrip";
import { OffersBand } from "@/components/sections/OffersBand";
import { Editorial } from "@/components/sections/Editorial";
import {
  getBanners,
  getCategories,
  getOffers,
  getProducts,
} from "@/lib/data";
import { getHeroSettings, getHomeEditorial } from "@/lib/admin/settings";
import { applyCategoryOffers } from "@/lib/offers";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [banners, categories, rawFeatured, rawTrending, rawNewArrivals, offers, heroSettings, homeEditorial] = await Promise.all([
    getBanners(),
    getCategories(),
    getProducts({ featured: true, limit: 4 }),
    getProducts({ trending: true, limit: 8 }),
    getProducts({ newArrival: true, limit: 4 }),
    getOffers(),
    getHeroSettings(),
    getHomeEditorial(),
  ]);

  // Apply any live category-wide offers to product prices.
  const featured = applyCategoryOffers(rawFeatured, offers);
  const trending = applyCategoryOffers(rawTrending, offers);
  const newArrivals = applyCategoryOffers(rawNewArrivals, offers);
  const homeEditorialImage = homeEditorial.image_url;

  const t = await getTranslations("sections");
  const catalogHref = "/shop";

  const heroSlides = banners
    .filter((b) => b.is_active && b.desktop_image_url)
    .map((b) => ({
      id: b.id,
      imageDesktop: b.desktop_image_url!,
      imageMobile: b.mobile_image_url,
      linkUrl: b.link_url,
      title: b.title,
      badgeText: b.badge_text,
    }));

  return (
    <>
      <Hero
        slides={heroSlides}
        intervalSec={heroSettings.rotation_seconds}
        primaryBrowseHref={catalogHref}
      />

      {/* Featured */}
      <section className="py-20 lg:py-32">
        <Container size="xl">
          <SectionHeader
            eyebrow="Hand-picked"
            title={t("featured")}
            subtitle={t("featuredSub")}
            href={catalogHref}
            hrefLabel={t("seeAll")}
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
            href={catalogHref}
            hrefLabel={t("allPieces")}
          />
          <div className="mt-12 lg:mt-16">
            <CategoryStrip categories={categories.slice(0, 6)} offers={offers} />
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
            <OffersBand offers={offers} categories={categories} />
          </div>
        </Container>
      </section>

      {/* Editorial moment */}
      <section className="py-20 lg:py-32 bg-ink-panel">
        <Container size="xl">
          <Editorial
            dark
            eyebrow="Our family shop"
            title="Pretty things, simple to buy."
            body="Vigneshwara Novelties is a family-run showroom in Cherial, Telangana — with more than 20 years in the business. We pick 1-gram gold jewelry, German silver, pulse chains and gift articles ourselves, and explain everything in simple words. Visit us, or just message on WhatsApp."
            imageUrl={homeEditorialImage}
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
            href={catalogHref}
            hrefLabel={t("seeAll")}
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
            href={catalogHref}
            hrefLabel={t("seeAll")}
          />
          <div className="mt-12 lg:mt-16">
            <ProductGrid products={newArrivals} cols={4} />
          </div>
        </Container>
      </section>

      {/* For returning visitors */}
      <RecentlyViewedStrip title="Pick up where you left off" />
    </>
  );
}
