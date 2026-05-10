import Link from "next/link";
import { adminGetInquiries, adminGetInquiryStats } from "@/lib/admin/queries";
import { isAdminConfigured } from "@/lib/admin/auth";
import { formatINR } from "@/lib/format";

export default async function AdminDashboard() {
  const [stats, inquiries] = await Promise.all([
    adminGetInquiryStats(),
    adminGetInquiries(),
  ]);
  const recent = inquiries.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Welcome back</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Today at the showroom
        </h1>
      </div>

      {!isAdminConfigured() && (
        <div className="p-5 bg-champagne/10 border border-champagne/40 text-sm text-ink/80">
          <p className="font-medium mb-1">Connect Supabase to see live inquiries</p>
          <p className="text-xs leading-relaxed">
            Add your Supabase URL and keys to <code className="bg-mist px-1">.env.local</code>,
            then run <code className="bg-mist px-1">supabase/migrations/0001_initial.sql</code>{" "}
            in your project. Until then, this dashboard shows empty data.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCard label="New" value={stats.new} highlight href="/admin/inquiries?status=new" />
        <StatCard label="Today" value={stats.today} href="/admin/inquiries" />
        <StatCard label="Contacted" value={stats.contacted} href="/admin/inquiries?status=contacted" />
        <StatCard label="Total" value={stats.total} href="/admin/inquiries" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/admin/products/new" className="btn-base btn-ink">
          + Add Product
        </Link>
        <Link href="/admin/inquiries" className="btn-base btn-ghost">
          View Inquiries
        </Link>
        <Link href="/admin/banners" className="btn-base btn-ghost">
          Update Banners
        </Link>
      </div>

      {/* Recent inquiries */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[1.5rem] text-ink">Recent inquiries</h2>
          <Link href="/admin/inquiries" className="smallcaps text-[0.6rem] text-ink/60 hover:text-ink">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="border border-dashed border-ink/15 p-8 text-center text-sm text-ink/50">
            No inquiries yet. They'll appear here as customers submit them.
          </div>
        ) : (
          <ul className="border border-ink/10 divide-y divide-ink/10">
            {recent.map((inq) => {
              const itemCount = inq.items.reduce((s, i) => s + i.qty, 0);
              const total = inq.items.reduce((s, i) => s + i.qty * i.snapshot.price, 0);
              return (
                <li key={inq.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{inq.customer_name}</p>
                    <p className="text-xs text-ink/50 tabular">
                      {itemCount} item{itemCount > 1 ? "s" : ""} · {formatINR(total)} · {inq.mobile}
                    </p>
                  </div>
                  <span
                    className={
                      inq.status === "new"
                        ? "smallcaps text-[0.55rem] text-champagne-deep"
                        : "smallcaps text-[0.55rem] text-ink/40"
                    }
                  >
                    {inq.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "block p-5 bg-ink text-ivory hover:bg-ink-soft transition-colors"
          : "block p-5 bg-mist-soft hover:bg-mist transition-colors"
      }
    >
      <p
        className={
          highlight
            ? "smallcaps text-[0.6rem] text-champagne mb-2"
            : "smallcaps text-[0.6rem] text-champagne-deep mb-2"
        }
      >
        {label}
      </p>
      <p className="font-display text-[2.5rem] tabular leading-none">{value}</p>
    </Link>
  );
}
