import Link from "next/link";
import { adminGetProducts } from "@/lib/admin/queries";
import { getCategories } from "@/lib/data";
import { ProductFilters } from "@/components/admin/ProductFilters";
import { ProductsGrid } from "@/components/admin/ProductsGrid";

export const metadata = { title: "Products · Admin" };

type Props = {
  searchParams: Promise<{ q?: string; category?: string; active?: string }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const [allProducts, categories] = await Promise.all([
    adminGetProducts(),
    getCategories(),
  ]);
  const { q, category, active } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();

  const filtered = allProducts.filter((p) => {
    if (category && p.category_id !== category) return false;
    if (active === "true" && !p.is_active) return false;
    if (active === "false" && p.is_active) return false;
    if (needle) {
      const hay = [p.title_en, p.title_te, p.sku, ...(p.tags ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const counts = {
    total: allProducts.length,
    active: allProducts.filter((p) => p.is_active).length,
    inactive: allProducts.filter((p) => !p.is_active).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Catalog</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Products
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            {filtered.length} of {allProducts.length} piece{allProducts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-base btn-ink">
          + Add Product
        </Link>
      </div>

      <ProductFilters categories={categories} counts={counts} />

      {filtered.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          {allProducts.length === 0 ? (
            <>
              No products yet.{" "}
              <Link href="/admin/products/new" className="underline">
                Add your first piece
              </Link>
              .
            </>
          ) : (
            "No products match those filters."
          )}
        </div>
      ) : (
        <ProductsGrid products={filtered} />
      )}
    </div>
  );
}
