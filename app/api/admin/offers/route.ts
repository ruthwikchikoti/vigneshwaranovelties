import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { offerPayloadSchema } from "@/lib/validations/category";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

function clean<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = { ...input };
  for (const k of Object.keys(out)) if (out[k] === "") out[k] = null;
  return out as Partial<T>;
}

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = offerPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("offers").insert(clean(parsed.data)).select().single();
    if (error) throw error;
    revalidateCache(CACHE_TAGS.offers);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[admin] offer create:", err);
    return NextResponse.json({ error: "db", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
