import { BannerForm } from "@/components/admin/BannerForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "New banner · Admin" };

export default async function NewBannerPage() {
  const categories = await adminGetCategories();
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/banners" label="All banners" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">Homepage banner</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Add Banner
        </h1>
      </div>
      <BannerForm categories={categories} />
    </div>
  );
}
