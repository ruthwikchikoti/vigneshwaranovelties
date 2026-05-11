import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";

export const runtime = "nodejs";

const BUCKET = "product-images";

const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

let bucketEnsured = false;

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  if (bucketEnsured) return;
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      throw createErr;
    }
  }
  bucketEnsured = true;
}

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  // Dev fallback (no real Supabase) — return a stable placeholder URL.
  if (!isSupabaseConfigured()) {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return NextResponse.json({
      url: `https://picsum.photos/seed/vn-upload-${seed}/1200/1500`,
      dev: true,
    });
  }

  try {
    const supabase = createServiceClient();
    await ensureBucket(supabase);

    const ext = file.name.split(".").pop() || "webp";
    const path = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "image/webp",
      upsert: false,
    });
    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[admin] upload:", err);
    return NextResponse.json(
      {
        error: "upload_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
