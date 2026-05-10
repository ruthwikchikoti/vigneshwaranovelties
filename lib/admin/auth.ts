import "server-only";
import { createClient } from "@/lib/supabase/server";

const ADMIN_DEV_BYPASS = process.env.ADMIN_DEV_BYPASS === "true";

const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );

export async function getAdminUser() {
  // Dev mode without Supabase — let admin panel render so it can be designed/tested.
  if (!isSupabaseConfigured()) {
    return ADMIN_DEV_BYPASS
      ? { id: "dev-admin", email: "dev@vigneshwaranovelties.local" }
      : null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}

export function isAdminConfigured() {
  return isSupabaseConfigured();
}
