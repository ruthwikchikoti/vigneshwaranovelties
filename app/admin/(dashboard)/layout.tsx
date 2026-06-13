import { redirect } from "next/navigation";
import { AdminBottomNav, AdminSidebar, AdminTopBar } from "@/components/admin/AdminNav";
import { getAdminUser } from "@/lib/admin/auth";

// This segment runs on the edge runtime. Supabase JS uses fetch, so it works
// fine here.
export const runtime = "edge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <>
      <AdminTopBar email={user.email} />
      <div className="flex flex-1 lg:flex-row flex-col">
        <AdminSidebar />
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-[80px] lg:pb-10 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <AdminBottomNav />
    </>
  );
}
