import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

// Offers are ordered by ends_at (they have no sort_order column), so they
// aren't drag-reorderable. Products are listed with search/filter — drag in a
// huge grid is impractical, so we skip them too.
const ALLOWED_TABLES = ["categories", "banners"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

const schema = z.object({
  table: z.enum(ALLOWED_TABLES),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0).max(99999),
      })
    )
    .min(1)
    .max(500),
});

export async function PATCH(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }

  const { table, items } = parsed.data;

  try {
    const supabase = createServiceClient();
    // Issue parallel single-column updates. PostgREST doesn't support bulk
    // updates with different values per row in a single call without RPC, but
    // this is a small admin operation (under a few hundred rows) so the parallel
    // requests are fine.
    const results = await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase.from(table as AllowedTable).update({ sort_order }).eq("id", id)
      )
    );
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    revalidateCache(CACHE_TAGS[table as keyof typeof CACHE_TAGS]);
    // Product queries join category data, so category reorders also stale product caches.
    if (table === "categories") revalidateCache(CACHE_TAGS.products);
    return NextResponse.json({ ok: true, count: items.length });
  } catch (err) {
    console.error(`[admin] reorder ${table}:`, err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
