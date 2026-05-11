import { setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/sections/ProductGrid";
import { searchProducts, getOffers } from "@/lib/data";
import { SearchInput } from "@/components/search/SearchInput";
import { applyCategoryOffers } from "@/lib/offers";

export const metadata = { title: "Search" };

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const term = (q ?? "").trim();
  const [rawProducts, offers] = term
    ? await Promise.all([searchProducts(term), getOffers()])
    : [[], []];
  const products = applyCategoryOffers(rawProducts, offers);

  return (
    <Container size="xl" className="py-12 lg:py-20">
      <p className="smallcaps text-[0.65rem] text-champagne-deep mb-4">Search</p>
      <h1 className="font-display text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem] text-ink leading-tight mb-8">
        {term ? <>Results for <em className="font-display-italic text-champagne-deep">&ldquo;{term}&rdquo;</em></> : "Find a piece"}
      </h1>

      <SearchInput initial={term} />

      {term ? (
        products.length === 0 ? (
          <div className="mt-16 lg:mt-20 border border-dashed border-ink/15 p-12 lg:p-20 text-center max-w-2xl mx-auto">
            <p className="font-display text-[1.5rem] text-ink mb-2">Nothing matches that yet.</p>
            <p className="text-sm text-ink/60 max-w-md mx-auto">
              Try a different word, browse a collection, or message us on WhatsApp — we can
              tell you whether the piece is available in the showroom.
            </p>
          </div>
        ) : (
          <div className="mt-10 lg:mt-14">
            <p className="text-xs text-ink/55 mb-6 tabular">
              {products.length} piece{products.length === 1 ? "" : "s"}
            </p>
            <ProductGrid products={products} cols={4} />
          </div>
        )
      ) : (
        <p className="mt-12 text-sm text-ink/55 max-w-md">
          Type a piece name, material (silver, gold, brass), or occasion (wedding, festive) to look up the catalogue.
        </p>
      )}
    </Container>
  );
}
