import "server-only";
import { createClient } from "./supabase/server";
import type { Banner, Category, Offer, Product } from "./supabase/types";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes("placeholder"));
}

async function safe<T>(real: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    return await real();
  } catch (err) {
    console.warn("[data] Supabase fetch failed, returning empty:", err);
    return fallback;
  }
}

const emptyProducts: Product[] = [];
const emptyCategories: Category[] = [];
const emptyOffers: Offer[] = [];
const emptyBanners: Banner[] = [];

export async function getCategories(): Promise<Category[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  }, emptyCategories);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return safe<Category | null>(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Category;
    },
    null
  );
}

export async function getProducts(
  options: {
    categoryId?: string;
    featured?: boolean;
    trending?: boolean;
    newArrival?: boolean;
    limit?: number;
  } = {}
): Promise<Product[]> {
  return safe(async () => {
    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select("*, images:product_images(*), category:categories(*)")
      .eq("is_active", true);
    if (options.categoryId) query = query.eq("category_id", options.categoryId);
    if (options.featured) query = query.eq("is_featured", true);
    if (options.trending) query = query.eq("is_trending", true);
    if (options.newArrival) query = query.eq("is_new_arrival", true);
    if (options.limit) query = query.limit(options.limit);
    query = query.order("sort_order");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Product[];
  }, emptyProducts);
}

export async function searchProducts(
  query: string,
  options: { limit?: number } = {}
): Promise<Product[]> {
  const term = query.trim();
  if (!term) return [];

  const limit = options.limit ?? 60;

  return safe(async () => {
    const supabase = await createClient();
    const ilikeArg = `%${term.replace(/[%_]/g, "\\$&")}%`;
    const { data, error } = await supabase
      .from("products")
      .select("*, images:product_images(*), category:categories(*)")
      .eq("is_active", true)
      .or(
        [
          `title_en.ilike.${ilikeArg}`,
          `title_te.ilike.${ilikeArg}`,
          `description_en.ilike.${ilikeArg}`,
          `description_te.ilike.${ilikeArg}`,
        ].join(",")
      )
      .order("sort_order")
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Product[];
  }, emptyProducts);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return safe<Product | null>(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, images:product_images(*), category:categories(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as Product;
    },
    null
  );
}

export async function getOffers(): Promise<Offer[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true);
    if (error) throw error;
    return (data ?? []) as Offer[];
  }, emptyOffers);
}

export async function getBanners(position?: Banner["position"]): Promise<Banner[]> {
  return safe(async () => {
    const supabase = await createClient();
    let query = supabase.from("banners").select("*").eq("is_active", true);
    if (position) query = query.eq("position", position);
    query = query.order("sort_order");
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Banner[];
  }, emptyBanners);
}
