import Link from "next/link";

const items = [
  { href: "/admin/inquiries", label: "Inquiries", desc: "Customer orders & requests" },
  { href: "/admin/categories", label: "Categories", desc: "Manage collections" },
  { href: "/admin/banners", label: "Banners", desc: "Homepage hero banners" },
  { href: "/admin/offers", label: "Offers", desc: "Active sales & discounts" },
  { href: "/admin/cms", label: "Pages", desc: "Edit About, Contact, FAQ & legal" },
  { href: "/admin/settings", label: "Settings", desc: "Announce bar, hero timing, email" },
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
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="block p-5 bg-mist-soft border border-ink/10 hover:border-ink hover:bg-mist transition-colors"
          >
            <h2 className="font-display text-[1.3rem] text-ink">
              Visit site
              <span className="text-ink/40 text-sm ml-2" aria-hidden="true">↗</span>
            </h2>
            <p className="text-xs text-ink/60 mt-1">Open the storefront in a new tab</p>
          </Link>
        </li>
        <li>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="w-full text-left p-5 bg-ivory border border-vermilion/30 hover:border-vermilion hover:bg-vermilion-soft/30 transition-colors"
            >
              <h2 className="font-display text-[1.3rem] text-vermilion">Sign out</h2>
              <p className="text-xs text-ink/60 mt-1">End this admin session</p>
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
