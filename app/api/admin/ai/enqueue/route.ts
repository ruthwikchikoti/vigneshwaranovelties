import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { enqueueSchema } from "@/lib/validations/ai";
import { aiConfig, aiConfigured } from "@/lib/ai/config";
import { selectShots } from "@/lib/ai/presets";
import { sourceFingerprint } from "@/lib/ai/bytes";
import { originalImages } from "@/lib/product-images";
import type { Product } from "@/lib/supabase/types";

export const runtime = "edge";

/**
 * Create (or reuse) an AI image job for a product, then return the list of
 * variants for the client to generate one-by-one. Idempotent: a completed job
 * with the same source fingerprint is returned as-is unless `force` is set.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cfg = aiConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = enqueueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }
  const { productId, force } = parsed.data;

  try {
    const supabase = createServiceClient();

    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*, images:product_images(*), category:categories(*)")
      .eq("id", productId)
      .single();
    if (prodErr || !product) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const originals = originalImages((product as Product).images);
    if (!originals.length) {
      return NextResponse.json(
        { error: "no_source", message: "Add at least one photo before generating." },
        { status: 400 }
      );
    }

    const variants = selectShots(cfg.imagesPerProduct);
    // Include the OpenAI model so switching models busts the cache.
    const fingerprint = await sourceFingerprint(
      originals.map((i) => i.original_url),
      variants.length,
      cfg.openaiModel
    );

    // Look for an existing job with this exact source fingerprint.
    const { data: existing } = await supabase
      .from("ai_image_jobs")
      .select("*")
      .eq("product_id", productId)
      .eq("source_fingerprint", fingerprint)
      .maybeSingle();

    if (existing && !force && existing.status === "completed") {
      // Nothing changed and the run already finished — don't spend again.
      return NextResponse.json({
        jobId: existing.id,
        total: existing.variants_total,
        alreadyComplete: true,
        mock: !aiConfigured(),
        variants: variants.map((v, index) => ({ index, id: v.id, label: v.label })),
      });
    }

    // Fresh run: clear out prior un-approved AI rows for this product so the
    // review grid isn't cluttered with stale attempts. Approved images stay.
    await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId)
      .in("ai_status", ["pending", "rejected"]);

    // Upsert the job (unique on product_id + fingerprint) and reset counters.
    const { data: job, error: jobErr } = await supabase
      .from("ai_image_jobs")
      .upsert(
        {
          product_id: productId,
          source_fingerprint: fingerprint,
          status: "running",
          model: cfg.openaiModel,
          variants_total: variants.length,
          variants_done: 0,
          variants_failed: 0,
          error: null,
        },
        { onConflict: "product_id,source_fingerprint" }
      )
      .select()
      .single();
    if (jobErr || !job) throw jobErr ?? new Error("could not create job");

    return NextResponse.json({
      jobId: job.id,
      total: variants.length,
      mock: !aiConfigured(),
      variants: variants.map((v, index) => ({ index, id: v.id, label: v.label })),
    });
  } catch (err) {
    console.error("[admin] ai enqueue:", err);
    return NextResponse.json(
      { error: "server", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
