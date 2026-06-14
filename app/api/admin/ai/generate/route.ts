import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { generateSchema } from "@/lib/validations/ai";
import { aiConfig, aiConfigured } from "@/lib/ai/config";
import { selectShots, buildInstruction } from "@/lib/ai/presets";
import { fetchSourceImage, generateImage } from "@/lib/ai/bedrock";
import { originalImages } from "@/lib/product-images";
import type { Product } from "@/lib/supabase/types";

// Node.js runtime (NOT edge): a Bedrock image call ships a multi-MB base64 body
// and can take 20-40s — neither suits Next's edge runtime. maxDuration gives it
// headroom on Vercel serverless.
export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "product-images";

/**
 * Produce ONE variant for a job: re-shoot the product's primary photo into the
 * shot's look with Google Gemini, upload the result, and record a pending
 * product_images row for the owner to review.
 *
 * Failures return HTTP 200 { ok: false } so the client keeps going through the
 * remaining variants.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 422 });

  const { jobId, index } = parsed.data;
  const cfg = aiConfig();
  const supabase = createServiceClient();

  const { data: job, error: jobErr } = await supabase
    .from("ai_image_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const shot = selectShots(job.variants_total)[index];
  if (!shot) return NextResponse.json({ error: "bad_index" }, { status: 400 });

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(*)")
    .eq("id", job.product_id)
    .single();
  if (prodErr || !product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const originals = originalImages((product as Product).images);
  if (!originals.length) return NextResponse.json({ ok: false, error: "no_source" });

  // Idempotency: only skip if THIS run already produced a *pending* image for
  // this shot (i.e. a client retry of the same index). We must NOT skip when an
  // approved/rejected image for this variant exists from a previous run — the
  // job id is reused across "Generate again" (same source fingerprint), so
  // otherwise already-approved shots would never regenerate.
  const { data: existingImg } = await supabase
    .from("product_images")
    .select("*")
    .eq("ai_job_id", jobId)
    .eq("ai_variant", shot.id)
    .eq("ai_status", "pending")
    .maybeSingle();
  if (existingImg) {
    return NextResponse.json({ ok: true, skipped: true, image: existingImg });
  }

  const primary = originals.find((i) => i.is_primary) ?? originals[0];

  // Build the prompt from the product subject (title / category / tags) + this
  // shot's styling + the shared fidelity clause.
  const product_ = product as Product;
  const tags = (product_.tags ?? []).filter(Boolean).slice(0, 3);
  const subject = [product_.title_en, product_.category?.name_en, tags.join(", ")]
    .filter(Boolean)
    .join(", ");
  const prompt = buildInstruction(shot, subject);

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const source = await fetchSourceImage(primary.original_url);

      let outBytes: Uint8Array;
      let contentType: string;
      let ext: string;
      let mock = false;
      if (!aiConfigured()) {
        // DEV MOCK: skip OpenAI entirely and reuse the original bytes so the
        // enqueue → generate → review → publish flow works at zero cost.
        outBytes = source.bytes;
        contentType = source.mime;
        ext = source.mime === "image/jpeg" ? "jpg" : source.mime === "image/webp" ? "webp" : "png";
        mock = true;
      } else {
        const result = await generateImage(source, prompt);
        outBytes = result.bytes;
        contentType = result.contentType;
        ext = result.ext;
      }

      const path = `${cfg.storagePrefix}/${job.product_id}/${jobId}-${shot.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, new Blob([outBytes as unknown as BlobPart], { type: contentType }), {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Cache-bust: the file path is stable across re-runs (same job id), and
      // objects carry a 1-year cache header — so without a fresh token the
      // browser/CDN would keep serving the OLD image after a regenerate.
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { data: imgRow, error: insErr } = await supabase
        .from("product_images")
        .insert({
          product_id: job.product_id,
          original_url: primary.original_url, // provenance
          ai_generated_url: publicUrl,
          ai_status: "pending",
          ai_variant: shot.id,
          ai_prompt: prompt,
          ai_model: mock ? "dev-mock" : cfg.bedrockModelId,
          ai_job_id: jobId,
          is_primary: false,
          sort_order: 1000 + index,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const done = job.variants_done + 1;
      const remaining = job.variants_total - done - job.variants_failed;
      await supabase
        .from("ai_image_jobs")
        .update({
          variants_done: done,
          status: remaining <= 0 ? (job.variants_failed > 0 ? "partial" : "completed") : "running",
        })
        .eq("id", jobId);

      return NextResponse.json({
        ok: true,
        image: imgRow,
        progress: { done, failed: job.variants_failed, total: job.variants_total },
      });
    } catch (err) {
      lastErr = err;
      console.warn(`[admin] ai generate attempt ${attempt} (${shot.id}):`, err);
    }
  }

  const failed = job.variants_failed + 1;
  const remaining = job.variants_total - job.variants_done - failed;
  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  await supabase
    .from("ai_image_jobs")
    .update({
      variants_failed: failed,
      error: message.slice(0, 500),
      status: remaining <= 0 ? (job.variants_done > 0 ? "partial" : "failed") : "running",
    })
    .eq("id", jobId);

  return NextResponse.json({
    ok: false,
    error: message,
    variant: shot.id,
    progress: { done: job.variants_done, failed, total: job.variants_total },
  });
}
