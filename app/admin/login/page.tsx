import { redirect } from "next/navigation";
import Link from "next/link";
import { Seal } from "@/components/brand/Seal";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminUser, isAdminConfigured } from "@/lib/admin/auth";

export const metadata = { title: "Sign in · Admin", robots: { index: false } };

export default async function AdminLoginPage() {
  const user = await getAdminUser();
  if (user) redirect("/admin");

  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 bg-ivory">
      <div className="w-full max-w-sm">
        <Link href="/admin" className="flex flex-col items-center gap-3 mb-10">
          <Seal size={96} priority />
          <span className="font-display text-[1.25rem] text-ink">Vigneshwara Novelties</span>
          <span className="smallcaps text-[0.55rem] text-champagne-deep">Admin</span>
        </Link>

        <h1 className="font-display text-[2rem] text-ink mb-2">Sign in</h1>
        <p className="text-ink/60 text-sm mb-8">
          Use your store admin email and password.
        </p>

        {!isAdminConfigured() && (
          <div className="mb-6 p-4 bg-champagne/10 border border-champagne/40 text-xs text-ink/80 leading-relaxed">
            <p className="font-medium mb-1">Setup needed</p>
            <p>
              Connect Supabase to enable login. Update <code className="bg-mist px-1">.env.local</code> with your project URL and keys, then run the migration in <code className="bg-mist px-1">supabase/migrations/0001_initial.sql</code>.
            </p>
          </div>
        )}

        <LoginForm />

        <p className="text-xs text-ink/40 mt-10 text-center">
          ← <Link href="/" className="underline underline-offset-2">Back to site</Link>
        </p>
      </div>
    </div>
  );
}
