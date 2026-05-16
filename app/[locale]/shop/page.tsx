import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { CatalogPagination } from "@/components/shop/CatalogPagination";
import { getAllProductsPaginated, getOffers, SHOP_PAGE_SIZE } from "@/lib/data";
import { applyCategoryOffers } from "@/lib/offers";
import { routing } from "@/i18n/routing";
import { site } from "@/lib/site";

export const runtime = "edge";

function shopPath(locale: string, page: number): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const q = page > 1 ? `?page=${page}` : "";
  return `${prefix}/shop${q}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ShopPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const raw = sp.page;
  const parsed = raw === undefined || raw === "" ? 1 : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    redirect(shopPath(locale, 1));
  }
  let page = parsed;

  const [rawResult, offers] = await Promise.all([
    getAllProductsPaginated({ page, pageSize: SHOP_PAGE_SIZE }),
    getOffers(),
  ]);
  let { products, total } = rawResult;
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));

  if (total > 0 && page > totalPages) {
    redirect(shopPath(locale, totalPages));
  }

  products = applyCategoryOffers(products, offers);

  const t = await getTranslations("shop");
  const tCommon = await getTranslations("common");

  return (
    <Container size="xl" className="py-12 sm:py-16 lg:py-24">
      <header className="max-w-3xl mb-10 sm:mb-12 lg:mb-14">
        <p className="smallcaps text-[0.65rem] text-champagne-deep mb-3 sm:mb-4">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-[2.1rem] sm:text-[3rem] lg:text-[3.75rem] text-ink leading-[1.05] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mt-4 sm:mt-5 text-ink/70 text-[1rem] sm:text-[1.06rem] leading-relaxed max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      {total === 0 ? (
        <div className="border border-dashed border-ink/15 rounded-sm p-10 sm:p-14 lg:p-20 text-center max-w-2xl mx-auto bg-mist-soft/30">
          <p className="font-display text-[1.35rem] sm:text-[1.5rem] text-ink mb-3">
            {t("emptyTitle")}
          </p>
          <p className="text-sm sm:text-[0.95rem] text-ink/65 mb-6 max-w-md mx-auto leading-relaxed">
            {t("emptyBody")}
          </p>
          <a
            href={`https://wa.me/${site.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-base btn-whatsapp inline-flex"
          >
            {t("emptyCta")}
          </a>
        </div>
      ) : (
        <>
          <p className="text-xs sm:text-sm text-ink/55 mb-6 sm:mb-8 tabular">
            {t("countLabel", { count: total })}
          </p>
          <ProductGrid products={products} cols={4} priorityCount={8} />
          <CatalogPagination
            currentPage={page}
            totalPages={totalPages}
            basePath="/shop"
            prevLabel={t("prev")}
            nextLabel={t("next")}
            pageLabel={(current, tot) => t("pageOf", { current, total: tot })}
            paginationLabel={tCommon("pagination")}
          />
        </>
      )}
    </Container>
  );
}
