import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Standard cache tags used across the app. Each tag corresponds to a Supabase
 * table (or logical group) whose cached data should be invalidated together.
 */
export const CACHE_TAGS = {
  categories: "categories",
  products: "products",
  banners: "banners",
  offers: "offers",
  settings: "settings",
  cms: "cms",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Default TTL in seconds. Acts as a safety net if invalidation fails.
 *
 * NOTE (Cloudflare Pages): Without a KV-backed suspense cache
 * (__NEXT_ON_PAGES__KV_SUSPENSE_CACHE), tag invalidation is per-colo
 * (per Cloudflare data center). An admin revalidation in one colo won't
 * invalidate entries cached in other colos. This TTL safety-net
 * (DEFAULT_REVALIDATE) bounds worst-case staleness to 60 seconds.
 * For global sub-minute freshness, bind a KV namespace.
 */
const DEFAULT_REVALIDATE = 60;

/**
 * Wraps a Supabase query function with `unstable_cache`.
 *
 * NOTE: `unstable_cache` is deprecated in Next.js 15 in favor of the
 * `"use cache"` directive. However, `@cloudflare/next-on-pages` does not
 * yet support `"use cache"`, so `unstable_cache` is the pragmatic choice.
 * Migrate to `"use cache"` once `next-on-pages` adds support.
 *
 * @param fn        - Async function that performs the Supabase query.
 *                    MUST use `createServiceClient()` (not `createClient()`)
 *                    because `createClient()` calls `cookies()` which makes
 *                    the function dynamic and prevents caching.
 * @param keyParts  - Unique cache key segments (e.g., ["getCategories"]).
 * @param tags      - Cache tags for on-demand invalidation.
 * @param revalidate - TTL in seconds (default: 60).
 */
export function cachedQuery<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: CacheTag[],
  revalidate: number = DEFAULT_REVALIDATE,
): Promise<T> {
  return unstable_cache(fn, keyParts, { revalidate, tags })();
}

/**
 * Invalidate all cache entries tagged with the given tags.
 * Call this from admin API routes after successful mutations.
 */
export function revalidateCache(...tags: CacheTag[]): void {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}
