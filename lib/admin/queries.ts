import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { demoProducts, demoCategories } from "@/lib/demo-data";
import type { Inquiry, Product, Category } from "@/lib/supabase/types";

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

/**
 * All admin reads use the service role key — auth is enforced at the page
 * layout (getAdminUser) before these run. This avoids RLS surprises and lets
 * the admin see all rows including inactive ones.
 */
export async function adminGetInquiries(): Promise<Inquiry[]> {
  if (!isConfigured()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[admin] inquiries fetch:", error);
    return [];
  }
  return (data ?? []) as Inquiry[];
}

export async function adminGetInquiryStats() {
  if (!isConfigured()) {
    return { total: 0, new: 0, contacted: 0, today: 0 };
  }
  const supabase = createServiceClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ count: total }, { count: open }, { count: contacted }, { count: todayCount }] =
    await Promise.all([
      supabase.from("inquiries").select("id", { count: "exact", head: true }),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "contacted"),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString()),
    ]);

  return {
    total: total ?? 0,
    new: open ?? 0,
    contacted: contacted ?? 0,
    today: todayCount ?? 0,
  };
}

export async function adminGetProducts(): Promise<Product[]> {
  if (!isConfigured()) return demoProducts;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(*)")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin] products fetch:", error);
    return [];
  }
  return (data ?? []) as Product[];
}

export async function adminGetCategories(): Promise<Category[]> {
  if (!isConfigured()) return demoCategories;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[admin] categories fetch:", error);
    return [];
  }
  return (data ?? []) as Category[];
}
