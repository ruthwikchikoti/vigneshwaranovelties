import { notFound } from "next/navigation";
import { OfferForm } from "@/components/admin/OfferForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { adminGetOffers } from "@/lib/admin/queries-extra";
import { adminGetCategories } from "@/lib/admin/queries";

export const metadata = { title: "Edit offer · Admin" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [all, categories] = await Promise.all([
    adminGetOffers(),
    adminGetCategories(),
  ]);
  const offer = all.find((o) => o.id === id);
  if (!offer) notFound();
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <AdminBackLink href="/admin/offers" label="All offers" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">Editing</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          {offer.title_en}
        </h1>
      </div>
      <OfferForm offer={offer} categories={categories} />
    </div>
  );
}
