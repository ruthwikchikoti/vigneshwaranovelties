import { adminGetInquiries } from "@/lib/admin/queries";
import { InquiriesTable } from "@/components/admin/InquiriesTable";

export const metadata = { title: "Inquiries · Admin" };

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const all = await adminGetInquiries();
  const filtered = status ? all.filter((i) => i.status === status) : all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Customer requests</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Inquiries
        </h1>
      </div>

      <InquiriesTable inquiries={filtered} />
    </div>
  );
}
