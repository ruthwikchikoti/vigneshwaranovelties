import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { reviewSchema } from "@/lib/validations/ai";

export const runtime = "edge";

const BUCKET = "product-images";

/** Extract the in-bucket object path from a Supabase public storage URL. */
function bucketPath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

/** Approve / reject / delete a single AI variant image. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }
  const { imageId, action } = parsed.data;

  try {
    const supabase = createServiceClient();

    const { data: img, error: readErr } = await supabase
      .from("product_images")
      .select("*")
      .eq("id", imageId)
      .single();
    if (readErr || !img) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if ((img.ai_status ?? "none") === "none") {
      return NextResponse.json({ error: "not_ai_image" }, { status: 400 });
    }

    if (action === "delete") {
      // Best-effort remove the stored object, then the row.
      const path = bucketPath(img.ai_generated_url ?? "");
      if (path) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
        if (rmErr) console.warn("[admin] ai delete storage:", rmErr.message);
      }
      const { error: delErr } = await supabase
        .from("product_images")
        .delete()
        .eq("id", imageId);
      if (delErr) throw delErr;
      return NextResponse.json({ ok: true, deleted: true });
    }

    const ai_status = action === "approve" ? "approved" : "rejected";
    const { data: updated, error: updErr } = await supabase
      .from("product_images")
      .update({ ai_status })
      .eq("id", imageId)
      .select()
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, image: updated });
  } catch (err) {
    console.error("[admin] ai review:", err);
    return NextResponse.json(
      { error: "server", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
