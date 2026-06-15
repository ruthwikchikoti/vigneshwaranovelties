import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { DuplicateProductButton } from "@/components/admin/DuplicateProductButton";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories, adminGetProduct } from "@/lib/admin/queries";

export const metadata = { title: "Edit product · Admin" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    adminGetProduct(id),
    adminGetCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex flex-col gap-3">
        <AdminBackLink href="/admin/products" label="All products" />
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="smallcaps text-[0.65rem] text-champagne-deep">Editing</p>
            <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
              {product.title_en}
            </h1>
          </div>
          <DuplicateProductButton productId={product.id} />
        </div>
      </div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
