import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { slugify } from "@/lib/utils";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: original, error: readErr } = await supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("id", id)
      .single();
    if (readErr || !original) throw readErr ?? new Error("Product not found");

    const newTitleEn = `${original.title_en} (Copy)`;
    const newTitleTe = original.title_te ? `${original.title_te} (Copy)` : null;

    // Ensure the slug is unique by appending -copy plus a short suffix if needed.
    let baseSlug = slugify(newTitleEn);
    let candidate = baseSlug;
    let suffix = 1;
    // Quick uniqueness loop — caps at 10 tries (more than enough).
    while (suffix <= 10) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!existing) break;
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    const {
      id: _id,
      created_at: _created,
      updated_at: _updated,
      images: _images,
      ...rest
    } = original;

    const { data: created, error: insertErr } = await supabase
      .from("products")
      .insert({
        ...rest,
        title_en: newTitleEn,
        title_te: newTitleTe,
        slug: candidate,
        sku: null,
        is_active: false,
      })
      .select("id")
      .single();
    if (insertErr || !created) throw insertErr ?? new Error("Insert failed");

    // Duplicate the image rows pointing at the same CDN URLs — no re-upload needed.
    if (Array.isArray(original.images) && original.images.length) {
      const imgRows = original.images.map((img: { original_url: string; sort_order: number | null; is_primary: boolean | null }, idx: number) => ({
        product_id: created.id,
        original_url: img.original_url,
        sort_order: img.sort_order ?? idx,
        is_primary: img.is_primary ?? idx === 0,
      }));
      const { error: imgErr } = await supabase.from("product_images").insert(imgRows);
      if (imgErr) throw imgErr;
    }

    revalidateCache(CACHE_TAGS.products);
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("[admin] product duplicate:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
