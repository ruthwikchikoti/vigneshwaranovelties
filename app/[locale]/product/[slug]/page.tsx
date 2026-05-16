import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { RecentlyViewedTracker } from "@/components/product/RecentlyViewedTracker";
import { RecentlyViewedStrip } from "@/components/product/RecentlyViewedStrip";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/routing";
import { localize } from "@/lib/supabase/types";
import { discountPercent, formatINR } from "@/lib/format";
import { getProductBySlug, getProducts, getOffers } from "@/lib/data";
import { applyCategoryOffer, applyCategoryOffers } from "@/lib/offers";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const title = localize(product, locale as "en" | "te", "title");
  const description = localize(product, locale as "en" | "te", "description");
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images?.[0]?.original_url ? [{ url: product.images[0].original_url }] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [rawProduct, offers] = await Promise.all([
    getProductBySlug(slug),
    getOffers(),
  ]);
  if (!rawProduct) notFound();
  const product = applyCategoryOffer(rawProduct, offers);

  const t = await getTranslations("product");
  const tSections = await getTranslations("sections");
  const tNav = await getTranslations("nav");
  const localeKey = locale as "en" | "te";
  const title = localize(product, localeKey, "title");
  const description = localize(product, localeKey, "description");
  const categoryName = product.category ? localize(product.category, localeKey, "name") : null;
  const price = product.price_inr;
  const discount = product.discount_price_inr;
  const discountPct = discountPercent(price, discount);
  const final = discount ?? price;

  // Same-category first; if the category has only this piece (or none), fall
  // back to a mix of trending + new arrivals so the strip is never empty.
  let related = await getProducts({
    categoryId: product.category_id ?? undefined,
    limit: 8,
  });
  related = related.filter((p) => p.id !== product.id);
  if (related.length < 4) {
    const seenIds = new Set([product.id, ...related.map((p) => p.id)]);
    const [trending, fresh] = await Promise.all([
      getProducts({ trending: true, limit: 8 }),
      getProducts({ newArrival: true, limit: 8 }),
    ]);
    for (const p of [...trending, ...fresh]) {
      if (related.length >= 4) break;
      if (!seenIds.has(p.id)) {
        related.push(p);
        seenIds.add(p.id);
      }
    }
  }
  const filteredRelated = applyCategoryOffers(related.slice(0, 4), offers);

  return (
    <>
      <Container size="xl" className="pt-6 lg:pt-12 pb-32 lg:pb-20">
        {/* Breadcrumbs */}
        <nav className="text-xs text-ink/50 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-ink transition-colors">{tNav("home")}</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link
                href={`/category/${product.category.slug}`}
                className="hover:text-ink transition-colors"
              >
                {categoryName}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-ink/80 truncate">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          <ProductGallery images={product.images ?? []} alt={title} />

          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:py-4">
            {categoryName && (
              <p className="smallcaps text-[0.65rem] text-champagne-deep">
                {categoryName}
              </p>
            )}
            <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[1] text-ink">
              {title}
            </h1>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap -mt-2">
              {product.is_new_arrival && <Badge variant="ink">{t("badgeNew")}</Badge>}
              {product.is_trending && <Badge variant="outline">{t("badgeTrending")}</Badge>}
              {product.has_sale_badge && discountPct ? (
                <Badge variant="sale">−{discountPct}%</Badge>
              ) : null}
            </div>

            <div className="divider-gold w-20 mt-1" />

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[2rem] tabular text-ink">
                {formatINR(final)}
              </span>
              {discount && discount < price ? (
                <>
                  <span className="tabular text-base text-ink/40 line-through">
                    {formatINR(price)}
                  </span>
                  {discountPct ? (
                    <span className="smallcaps text-[0.65rem] text-cognac">
                      {t("youSave")} {formatINR(price - discount)}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Stock badge */}
            <div>
              <span
                className={
                  product.stock_status === "in_stock"
                    ? "text-xs text-green-700/80 inline-flex items-center gap-1.5"
                    : product.stock_status === "made_to_order"
                    ? "text-xs text-champagne-deep inline-flex items-center gap-1.5"
                    : "text-xs text-cognac inline-flex items-center gap-1.5"
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {t(product.stock_status)}
              </span>
            </div>

            {/* Description */}
            {description && (
              <div className="mt-4 pt-6 border-t border-ink/10">
                <p className="text-ink/70 leading-relaxed text-[0.95rem]">{description}</p>
              </div>
            )}

            {/* SKU + tags */}
            <dl className="mt-2 grid grid-cols-2 gap-y-2 text-xs">
              {product.sku && (
                <>
                  <dt className="smallcaps text-[0.55rem] text-ink/50">{t("sku")}</dt>
                  <dd className="text-ink/80 tabular">{product.sku}</dd>
                </>
              )}
              {product.tags && product.tags.length > 0 && (
                <>
                  <dt className="smallcaps text-[0.55rem] text-ink/50">{t("tags")}</dt>
                  <dd className="text-ink/80">{product.tags.join(", ")}</dd>
                </>
              )}
            </dl>

            <div className="mt-6">
              <ProductActions product={product} />
            </div>
          </div>
        </div>
      </Container>

      {/* Track this view in the client-side store */}
      <RecentlyViewedTracker
        product_id={product.id}
        title={title}
        price={final}
        image={product.images?.[0]?.original_url ?? ""}
        slug={product.slug}
      />

      {filteredRelated.length > 0 && (
        <section className="py-20 lg:py-28 border-t border-ink/10 bg-mist-soft">
          <Container size="xl">
            <SectionHeader
              eyebrow={tSections("continueBrowsing")}
              title={tSections("youMayAlsoLove")}
              align="left"
            />
            <div className="mt-12">
              <ProductGrid products={filteredRelated} cols={4} />
            </div>
          </Container>
        </section>
      )}

      <RecentlyViewedStrip excludeId={product.id} />

      {/* JSON-LD Product structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: title,
            description,
            image: product.images?.[0]?.original_url,
            sku: product.sku,
            brand: { "@type": "Brand", name: "Vigneshwara Novelties" },
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: final,
              availability:
                product.stock_status === "in_stock"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/PreOrder",
            },
          }),
        }}
      />
    </>
  );
}
