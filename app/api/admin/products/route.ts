import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { productPayloadSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = productPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { images, ...product } = parsed.data;
  const baseSlug = slugify(product.slug || product.title_en) || "product";

  try {
    const supabase = createServiceClient();

    // Auto-deduplicate the slug so two products with the same name don't 500 on
    // the unique constraint — pick base, then base-2, base-3, …
    const { data: existing } = await supabase
      .from("products")
      .select("slug")
      .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);
    const taken = new Set((existing ?? []).map((r) => r.slug));
    let slug = baseSlug;
    for (let n = 2; taken.has(slug); n++) slug = `${baseSlug}-${n}`;
    product.slug = slug;

    const { data: row, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();
    if (error) throw error;

    if (images.length) {
      const { error: imgErr } = await supabase.from("product_images").insert(
        images.map((url, idx) => ({
          product_id: row.id,
          original_url: url,
          sort_order: idx,
          is_primary: idx === 0,
        }))
      );
      if (imgErr) throw imgErr;
    }

    revalidateCache(CACHE_TAGS.products);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[admin] product create:", err);
    const code = (err as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "duplicate", message: "A product with this name already exists. Please tweak the name." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: "db",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
