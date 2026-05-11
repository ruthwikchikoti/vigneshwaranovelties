import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { productPayloadSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils";

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
  product.slug = product.slug || slugify(product.title_en);

  try {
    const supabase = createServiceClient();
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

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[admin] product create:", err);
    return NextResponse.json(
      {
        error: "db",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
