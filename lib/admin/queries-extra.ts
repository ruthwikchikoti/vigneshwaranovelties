import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { Banner, Offer } from "@/lib/supabase/types";

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

export async function adminGetBanners(): Promise<Banner[]> {
  if (!isConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin] banners fetch:", error);
    return [];
  }
  return (data ?? []) as Banner[];
}

export async function adminGetOffers(): Promise<Offer[]> {
  if (!isConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .order("ends_at", { ascending: true });
  if (error) {
    console.error("[admin] offers fetch:", error);
    return [];
  }
  return (data ?? []) as Offer[];
}
