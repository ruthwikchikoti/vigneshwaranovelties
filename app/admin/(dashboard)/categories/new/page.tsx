import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "New category · Admin" };

export default async function NewCategoryPage() {
  const categories = await adminGetCategories();
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/categories" label="All categories" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">New collection</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Add Category
        </h1>
      </div>
      <CategoryForm categories={categories} />
    </div>
  );
}
