import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "Edit category · Admin" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await adminGetCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/categories" label="All categories" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">Editing</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          {category.name_en}
        </h1>
      </div>
      <CategoryForm category={category} />
    </div>
  );
}
