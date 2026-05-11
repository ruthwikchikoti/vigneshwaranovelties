import { OfferForm } from "@/components/admin/OfferForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "New offer · Admin" };

export default async function NewOfferPage() {
  const categories = await adminGetCategories();
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/offers" label="All offers" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">Limited time</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Add Offer
        </h1>
      </div>
      <OfferForm categories={categories} />
    </div>
  );
}
