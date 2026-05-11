import Link from "next/link";
import { adminGetCategories } from "@/lib/admin/queries";
import { CategorySortableList } from "@/components/admin/CategorySortableList";

export const metadata = { title: "Categories · Admin" };

export default async function AdminCategoriesPage() {
  const categories = await adminGetCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Collections</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Categories
          </h1>
          <p className="text-ink/60 text-sm mt-1">{categories.length} collections</p>
        </div>
        <Link href="/admin/categories/new" className="btn-base btn-ink">
          + Add Category
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          No categories yet.{" "}
          <Link href="/admin/categories/new" className="underline">
            Add your first one
          </Link>
          .
        </div>
      ) : (
        <CategorySortableList categories={categories} />
      )}
    </div>
  );
}
