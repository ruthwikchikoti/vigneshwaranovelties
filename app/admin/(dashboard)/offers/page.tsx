import Link from "next/link";
import Image from "next/image";
import { adminGetOffers } from "@/lib/admin/queries-extra";
import { ikImage, placeholderImage } from "@/lib/imagekit";

export const metadata = { title: "Offers · Admin" };

export default async function OffersPage() {
  const offers = await adminGetOffers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <p className="smallcaps text-[0.65rem] text-champagne-deep">Limited time</p>
          <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
            Offers
          </h1>
          <p className="text-ink/60 text-sm mt-1">{offers.length} offer{offers.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/offers/new" className="btn-base btn-ink">+ Add Offer</Link>
      </div>

      {offers.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          No offers yet. <Link href="/admin/offers/new" className="underline">Add one</Link>.
        </div>
      ) : (
        <ul className="grid gap-3">
          {offers.map((o) => {
            const url = o.banner_url ?? placeholderImage(o.title_en, 800, 400);
            const ends = o.ends_at ? new Date(o.ends_at).toLocaleDateString("en-IN") : "—";
            return (
              <li key={o.id}>
                <Link
                  href={`/admin/offers/${o.id}`}
                  className="flex gap-4 items-center p-3 bg-ivory border border-ink/10 hover:border-ink transition-colors"
                >
                  <div className="relative w-32 h-16 flex-shrink-0 overflow-hidden bg-mist">
                    <Image src={ikImage(url, { width: 400 })} alt="" fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{o.title_en}</p>
                    <p className="text-xs text-ink/50 mt-0.5 tabular">
                      {o.discount_pct ? `${o.discount_pct}% off · ` : ""}ends {ends}
                    </p>
                  </div>
                  <span className={o.is_active ? "smallcaps text-[0.55rem] text-champagne-deep" : "smallcaps text-[0.55rem] text-ink/30"}>
                    {o.is_active ? "Active" : "Off"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
