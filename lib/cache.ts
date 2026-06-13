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
 * Default TTL in seconds. Acts as a safety net if on-demand invalidation is
 * ever missed. On Vercel, `unstable_cache` + `revalidateTag` are backed by the
 * platform data cache, so tag invalidation propagates globally — this TTL just
 * bounds worst-case staleness.
 */
const DEFAULT_REVALIDATE = 60;

/**
 * Wraps a Supabase query function with `unstable_cache`.
 *
 * NOTE: `unstable_cache` is deprecated in Next.js 15 in favour of the
 * `"use cache"` directive; it still works and is the pragmatic choice today.
 * Migrate to `"use cache"` when convenient.
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
