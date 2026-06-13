import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { aiImages } from "@/lib/product-images";
import { aiConfigured } from "@/lib/ai/config";
import type { ProductImage } from "@/lib/supabase/types";

export const runtime = "edge";

/** Current AI job + the product's AI variant rows, for the admin review panel. */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "missing_product" }, { status: 400 });

  try {
    const supabase = createServiceClient();

    const [{ data: job }, { data: images }] = await Promise.all([
      supabase
        .from("ai_image_jobs")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("product_images").select("*").eq("product_id", productId),
    ]);

    return NextResponse.json({
      job: job ?? null,
      images: aiImages((images ?? []) as ProductImage[]),
      mock: !aiConfigured(),
    });
  } catch (err) {
    console.error("[admin] ai status:", err);
    return NextResponse.json(
      { error: "server", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
