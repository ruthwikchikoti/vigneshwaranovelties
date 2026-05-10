import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { productPayloadSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = productPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }

  const { images, ...product } = parsed.data;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").update(product).eq("id", id);
    if (error) throw error;

    // Replace image set entirely (admin uploads the full ordered list).
    await supabase.from("product_images").delete().eq("product_id", id);
    if (images.length) {
      await supabase.from("product_images").insert(
        images.map((url, idx) => ({
          product_id: id,
          original_url: url,
          sort_order: idx,
          is_primary: idx === 0,
        }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] product update:", err);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] product delete:", err);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}
