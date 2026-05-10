import Link from "next/link";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "Categories · Admin" };

export default async function AdminCategoriesPage() {
  const categories = await adminGetCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Collections</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Categories
          </h1>
          <p className="text-ink/60 text-sm mt-1">{categories.length} collections</p>
        </div>
        <Link href="/admin/categories/new" className="btn-base btn-ink">
          + Add
        </Link>
      </div>

      <ul className="bg-ivory border border-ink/10 divide-y divide-ink/5">
        {categories.map((c) => (
          <li key={c.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{c.name_en}</p>
              <p className="text-xs text-ink/50 tabular truncate">/{c.slug}</p>
            </div>
            <span
              className={
                c.is_active
                  ? "smallcaps text-[0.55rem] text-champagne-deep"
                  : "smallcaps text-[0.55rem] text-ink/30"
              }
            >
              {c.is_active ? "Visible" : "Hidden"}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink/50">
        Add/edit/reorder categories from this list. Each category has an English and Telugu name,
        an image, and a banner shown on the category page.
      </p>
    </div>
  );
}
