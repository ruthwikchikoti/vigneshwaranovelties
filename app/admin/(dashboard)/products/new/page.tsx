import { ProductForm } from "@/components/admin/ProductForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "Add product · Admin" };

export default async function NewProductPage() {
  const categories = await adminGetCategories();
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <AdminBackLink href="/admin/products" label="All products" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">New piece</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Add Product
        </h1>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
