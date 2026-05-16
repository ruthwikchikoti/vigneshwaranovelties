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

/** Default page size for the full-catalog /shop route. */
export const SHOP_PAGE_SIZE = 24;

export async function getAllProductsPaginated(options: {
  page: number;
  pageSize?: number;
}): Promise<{ products: Product[]; total: number }> {
  const pageSize = options.pageSize ?? SHOP_PAGE_SIZE;
  const page = Math.max(1, Math.floor(options.page));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return safe(
    async () => {
      const supabase = await createClient();
      const { data, error, count } = await supabase
        .from("products")
        .select("*, images:product_images(*), category:categories(*)", { count: "exact" })
        .eq("is_active", true)
        .order("sort_order")
        .range(from, to);
      if (error) throw error;
      return {
        products: (data ?? []) as Product[],
        total: count ?? 0,
      };
    },
    { products: [], total: 0 }
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

    // Use the database RPC that leverages the pg_trgm GIN index for fast,
    // typo-tolerant search across titles, descriptions, tags, and category
    // names.  Falls back to ILIKE for very short queries (< 3 chars).
    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "search_products",
      { query: term, result_limit: limit }
    );

    if (!rpcError && rpcRows) {
      // RPC succeeded — empty results means "no matches", which is valid.
      if (rpcRows.length === 0) return [];

      // The RPC returns flat product rows — hydrate with images & category.
      const ids = (rpcRows as { id: string }[]).map((r) => r.id);
      const { data, error } = await supabase
        .from("products")
        .select("*, images:product_images(*), category:categories(*)")
        .in("id", ids)
        .eq("is_active", true)
        .limit(ids.length);
      if (error) throw error;

      // Preserve the relevance order returned by the RPC.
      const byId = new Map((data ?? []).map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
    }

    // Fallback: if the RPC is not yet deployed (e.g. migration pending),
    // use the original ILIKE approach so the app keeps working.
    console.warn("[search] RPC unavailable, falling back to ILIKE:", rpcError?.message);
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
