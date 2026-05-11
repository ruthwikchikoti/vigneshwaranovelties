import Link from "next/link";
import { adminGetBanners } from "@/lib/admin/queries-extra";
import { BannerSortableList } from "@/components/admin/BannerSortableList";

export const metadata = { title: "Banners · Admin" };

export default async function BannersPage() {
  const banners = await adminGetBanners();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Homepage</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Banners
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            {banners.length} banner{banners.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/admin/banners/new" className="btn-base btn-ink">+ Add Banner</Link>
      </div>

      {banners.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          No banners yet. <Link href="/admin/banners/new" className="underline">Add one</Link>.
        </div>
      ) : (
        <>
          <div className="bg-champagne/10 border-l-4 border-champagne px-4 py-3 text-sm text-ink/80">
            All <span className="font-medium">active hero banners</span> rotate on the homepage (about 6 seconds each).
            Drag the ⋮⋮ handle to set the starting order. Toggle &ldquo;Active&rdquo; off in the banner&apos;s editor to hide one.
          </div>
          <BannerSortableList banners={banners} />
        </>
      )}
    </div>
  );
}
