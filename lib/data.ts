import "server-only";
import { createServiceClient } from "./supabase/server";
import { cachedQuery, CACHE_TAGS } from "./cache";
import type { Banner, Category, Offer, Product } from "./supabase/types";

/**
 * SECURITY NOTE: All queries in this module use `createServiceClient()`, which
 * authenticates with the Supabase **service role key** and bypasses Row-Level
 * Security (RLS). This is necessary because `unstable_cache` cannot close over
 * the request-scoped `cookies()` required by the anon-key client.
 *
 * As a consequence, every query MUST include explicit visibility filters
 * (e.g., `.eq("is_active", true)`) to avoid exposing draft/inactive rows.
 * Do NOT add queries here without appropriate filters.
 */

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

export function getCategories(): Promise<Category[]> {
  return safe(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");
          if (error) throw error;
          return (data ?? []) as Category[];
        },
        ["getCategories"],
        [CACHE_TAGS.categories],
      ),
    emptyCategories,
  );
}

export function getCategoryBySlug(slug: string): Promise<Category | null> {
  return safe<Category | null>(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq("slug", slug)
            .eq("is_active", true)
            .single();
          if (error) throw error;
          return data as Category;
        },
        ["getCategoryBySlug", slug],
        [CACHE_TAGS.categories],
      ),
    null,
  );
}

/** Default page size for the full-catalog /shop route. */
export const SHOP_PAGE_SIZE = 24;

export function getAllProductsPaginated(options: {
  page: number;
  pageSize?: number;
}): Promise<{ products: Product[]; total: number }> {
  const pageSize = options.pageSize ?? SHOP_PAGE_SIZE;
  const page = Math.max(1, Math.floor(options.page));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return safe(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
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
        ["getAllProductsPaginated", String(page), String(pageSize)],
        [CACHE_TAGS.products],
      ),
    { products: [], total: 0 },
  );
}

export function getProducts(
  options: {
    categoryId?: string;
    featured?: boolean;
    trending?: boolean;
    newArrival?: boolean;
    limit?: number;
  } = {},
): Promise<Product[]> {
  return safe(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
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
        },
        [
          "getProducts",
          options.categoryId ?? "",
          String(options.featured ?? false),
          String(options.trending ?? false),
          String(options.newArrival ?? false),
          String(options.limit ?? ""),
        ],
        [CACHE_TAGS.products],
      ),
    emptyProducts,
  );
}

export async function searchProducts(
  query: string,
  options: { limit?: number } = {},
): Promise<Product[]> {
  const term = query.trim();
  if (!term) return [];

  const limit = options.limit ?? 60;

  return safe(async () => {
    const supabase = createServiceClient();
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
        ].join(","),
      )
      .order("sort_order")
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Product[];
  }, emptyProducts);
}

export function getProductBySlug(slug: string): Promise<Product | null> {
  return safe<Product | null>(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
          const { data, error } = await supabase
            .from("products")
            .select("*, images:product_images(*), category:categories(*)")
            .eq("slug", slug)
            .eq("is_active", true)
            .single();
          if (error) throw error;
          return data as Product;
        },
        ["getProductBySlug", slug],
        [CACHE_TAGS.products],
      ),
    null,
  );
}

export function getOffers(): Promise<Offer[]> {
  return safe(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
          const { data, error } = await supabase
            .from("offers")
            .select("*")
            .eq("is_active", true);
          if (error) throw error;
          return (data ?? []) as Offer[];
        },
        ["getOffers"],
        [CACHE_TAGS.offers],
      ),
    emptyOffers,
  );
}

export function getBanners(position?: Banner["position"]): Promise<Banner[]> {
  return safe(
    () =>
      cachedQuery(
        async () => {
          const supabase = createServiceClient();
          let query = supabase.from("banners").select("*").eq("is_active", true);
          if (position) query = query.eq("position", position);
          query = query.order("sort_order");
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []) as Banner[];
        },
        ["getBanners", position ?? "all"],
        [CACHE_TAGS.banners],
      ),
    emptyBanners,
  );
}
