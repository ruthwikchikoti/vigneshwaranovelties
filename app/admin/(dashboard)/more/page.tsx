import Link from "next/link";

const items = [
  { href: "/admin/categories", label: "Categories", desc: "Manage collections" },
  { href: "/admin/banners", label: "Banners", desc: "Hero & promo banners" },
  { href: "/admin/offers", label: "Offers", desc: "Active sales & discounts" },
  { href: "/admin/settings", label: "Settings", desc: "Store info & contacts" },
];

export const metadata = { title: "More · Admin" };

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">All admin areas</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          More
        </h1>
      </div>
      <ul className="grid sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="block p-5 bg-mist-soft border border-ink/10 hover:border-ink hover:bg-mist transition-colors"
            >
              <h2 className="font-display text-[1.3rem] text-ink">{it.label}</h2>
              <p className="text-xs text-ink/60 mt-1">{it.desc}</p>
            </Link>
          </li>
        ))}
        <li>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="w-full text-left p-5 bg-ivory border border-cognac/30 hover:border-cognac hover:bg-cognac/5 transition-colors"
            >
              <h2 className="font-display text-[1.3rem] text-cognac">Sign out</h2>
              <p className="text-xs text-ink/60 mt-1">End this admin session</p>
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
