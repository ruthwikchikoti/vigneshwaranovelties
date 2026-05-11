import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/BannerForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetBanners } from "@/lib/admin/queries-extra";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "Edit banner · Admin" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [all, categories] = await Promise.all([
    adminGetBanners(),
    adminGetCategories(),
  ]);
  const banner = all.find((b) => b.id === id);
  if (!banner) notFound();
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/banners" label="All banners" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">Editing</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          {banner.title}
        </h1>
      </div>
      <BannerForm banner={banner} categories={categories} />
    </div>
  );
}
