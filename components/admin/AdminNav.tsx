"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Seal } from "@/components/brand/Seal";

function svg(d: string) {
  return ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const HomeIcon = svg("M3 11.5L12 4l9 7.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1v-8.5z");
const BellIcon = svg("M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M9 21a3 3 0 006 0");
const BoxIcon = svg("M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10");
const TagIcon = svg("M20 12V6a2 2 0 00-2-2h-6L4 12l8 8 8-8zM7 8h.01");
const StarIcon = svg("M12 2l2.6 7.5H22l-6.2 4.6L18.2 22 12 17.4 5.8 22l2.4-7.9L2 9.5h7.4z");
const ImageIcon = svg("M4 4h16v16H4zM4 16l5-5 4 4 5-5 2 2");
const FileIcon = svg("M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v6h6");
const GearIcon = svg("M12 8a4 4 0 100 8 4 4 0 000-8zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.1l-.4-2.4h-4l-.4 2.4a7 7 0 00-2 1.1l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12a7 7 0 00.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.1l.4 2.4h4l.4-2.4a7 7 0 002-1.1l2.3.9 2-3.4-2-1.5A7 7 0 0019 12z");
const GridIcon = svg("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z");

const links = [
  { href: "/admin", label: "Home", icon: HomeIcon },
  { href: "/admin/inquiries", label: "Inquiries", icon: BellIcon },
  { href: "/admin/products", label: "Products", icon: BoxIcon },
  { href: "/admin/categories", label: "Categories", icon: TagIcon },
  { href: "/admin/offers", label: "Offers", icon: StarIcon },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/cms", label: "Pages", icon: FileIcon },
  { href: "/admin/settings", label: "Settings", icon: GearIcon },
];

const mobileLinks = [
  { href: "/admin", label: "Home", icon: HomeIcon },
  { href: "/admin/inquiries", label: "Inquiries", icon: BellIcon },
  { href: "/admin/products", label: "Products", icon: BoxIcon },
  { href: "/admin/more", label: "More", icon: GridIcon },
];

export function AdminTopBar({ email }: { email?: string | null }) {
  return (
    <header className="bg-ivory-warm text-ink border-b border-ink/10">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 h-14 lg:h-16 flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Seal size={36} />
          <span className="font-display text-[1.05rem] hidden sm:inline text-ink">Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="smallcaps text-[0.6rem] text-ink/70 hover:text-ink inline-flex items-center gap-1.5"
            title="Open the public storefront in a new tab"
          >
            Visit site
            <span aria-hidden="true">↗</span>
          </Link>
          {email && (
            <span className="hidden sm:inline text-xs text-ink/55 tabular truncate max-w-[200px]">
              {email}
            </span>
          )}
          <form action="/admin/logout" method="post">
            <button type="submit" className="smallcaps text-[0.6rem] text-ink/70 hover:text-champagne-deep">
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 bg-mist-soft border-r border-ink/10">
      <nav className="p-4 sticky top-16">
        <ul className="space-y-1">
          {links.map((l) => {
            const active =
              pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-ink text-ivory" : "text-ink hover:bg-ink/5"
                  )}
                >
                  <l.icon />
                  <span>{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ivory border-t border-ink/10 safe-bottom">
      <ul className="grid grid-cols-4 h-[60px]">
        {mobileLinks.map((l) => {
          const active =
            pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-ink" : "text-ink/50"
                )}
              >
                <l.icon />
                <span className="text-[0.55rem] smallcaps tracking-[0.15em]">{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
