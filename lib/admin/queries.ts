import "server-only";
import { createClient } from "@/lib/supabase/server";
import { demoProducts, demoCategories } from "@/lib/demo-data";
import type { Inquiry, Product, Category } from "@/lib/supabase/types";

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );

export async function adminGetInquiries(): Promise<Inquiry[]> {
  if (!isConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(*)")
    .order("sort_order");
  if (error) {
    console.error("[admin] products fetch:", error);
    return [];
  }
  return (data ?? []) as Product[];
}

export async function adminGetCategories(): Promise<Category[]> {
  if (!isConfigured()) return demoCategories;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) {
    console.error("[admin] categories fetch:", error);
    return [];
  }
  return (data ?? []) as Category[];
}
