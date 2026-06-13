import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { generateSchema } from "@/lib/validations/ai";
import { aiConfig, isBedrockConfigured } from "@/lib/ai/config";
import { selectShots } from "@/lib/ai/presets";
import { produceCutout } from "@/lib/ai/provider";
import { composePreset } from "@/lib/ai/compose";
import { fetchSourceImage, controlStructure } from "@/lib/ai/bedrock";
import { originalImages } from "@/lib/product-images";
import type { Product } from "@/lib/supabase/types";

// Node.js runtime (NOT edge): this route runs sharp (native) and ships a
// multi-MB image to Bedrock — neither works on Next's edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "product-images";

/** Tiny deterministic hash → a stable seed per (product, shot) so scene shots
 *  re-render identically across retries and stay close to the upload. */
function seedFor(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Produce ONE variant for a job. Two engines:
 *
 *  - "studio": the first call removes the background once and caches the cutout;
 *    every studio call composites that cutout onto its shot's backdrop. So the
 *    studio shots cost a single Remove-Background call total, no matter how many
 *    backdrops are generated.
 *  - "scene": Stability Control Structure re-renders a styled scene guided by the
 *    original at high control_strength with a fixed seed (deterministic).
 *
 * Failures return HTTP 200 { ok: false } so the client keeps going.
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

  // Idempotency: this shot already produced for this job → return it.
  const { data: existingImg } = await supabase
    .from("product_images")
    .select("*")
    .eq("ai_job_id", jobId)
    .eq("ai_variant", shot.id)
    .maybeSingle();
  if (existingImg) {
    return NextResponse.json({ ok: true, skipped: true, image: existingImg });
  }

  const primary = originals.find((i) => i.is_primary) ?? originals[0];
  const cutoutPath = `${cfg.storagePrefix}/${job.product_id}/${jobId}-cutout.png`;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      // Each engine produces the final variant bytes + the metadata that goes
      // on the product_images row; the upload/insert/counter wrapper is shared.
      let outBytes: Uint8Array;
      let contentType: "image/webp" | "image/png";
      let ext: "webp" | "png";
      let mock = false;
      let prompt: string | null = null;

      if (shot.engine === "studio") {
        // STUDIO: Remove Background once (cached), then composite the EXACT
        // cutout onto this shot's backdrop. Faithful to the uploaded piece.
        let cutout: Uint8Array;
        const cached = await supabase.storage.from(BUCKET).download(cutoutPath);
        if (cached.data) {
          cutout = new Uint8Array(await cached.data.arrayBuffer());
        } else {
          const sourceBytes = await fetchSourceImage(primary.original_url);
          const produced = await produceCutout(sourceBytes);
          cutout = produced.bytes;
          mock = produced.mock;
          await supabase.storage.from(BUCKET).upload(
            cutoutPath,
            new Blob([cutout as unknown as BlobPart], { type: "image/png" }),
            { contentType: "image/png", cacheControl: "31536000", upsert: true }
          );
        }

        const composed = await composePreset(cutout, shot);
        outBytes = composed.bytes;
        contentType = composed.contentType;
        ext = "webp";
      } else {
        // SCENE: Stability Control Structure re-renders a styled scene guided by
        // the original at high control_strength, with a deterministic seed.
        const product_ = product as Product;
        const tags = (product_.tags ?? []).filter(Boolean).slice(0, 3);
        const subject = [product_.title_en, product_.category?.name_en, tags.join(", ")]
          .filter(Boolean)
          .join(", ");
        prompt =
          `Professional jewellery product photograph of ${subject}. ${shot.scene}. ` +
          `CRITICAL: preserve EVERY gemstone and its exact colour, every diamond, the ` +
          `exact metal tone, pendant shapes and chain layout from the original — do not ` +
          `blank out, recolour or remove any stones. Photorealistic, premium catalog ` +
          `quality, no text, no people.`;
        const negativePrompt =
          "plain metal pendant, blank pendant, missing stones, removed gemstones, " +
          "recoloured stones, wrong colour, extra jewellery, text, watermark, deformed, " +
          "distorted, people, hands, low quality";

        const sourceBytes = await fetchSourceImage(primary.original_url);
        if (!isBedrockConfigured()) {
          // DEV MOCK: skip Bedrock entirely and reuse the original bytes so the
          // enqueue → generate → review → publish flow works at zero cost.
          outBytes = sourceBytes;
          mock = true;
        } else {
          const seed = seedFor(`${job.product_id}:${shot.id}`);
          outBytes = await controlStructure(sourceBytes, {
            prompt,
            negativePrompt,
            controlStrength: shot.controlStrength,
            seed,
          });
        }
        contentType = "image/png";
        ext = "png";
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
          ai_model: mock
            ? "dev-mock"
            : shot.engine === "scene"
              ? cfg.controlModelId
              : cfg.removeBgModelId,
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
