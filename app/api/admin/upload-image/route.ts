import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";

export const runtime = "nodejs";

const BUCKET = "product-images";

const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  // Dev fallback — when Supabase isn't configured, just return a placeholder URL
  // so the admin form is testable end-to-end.
  if (!isSupabaseConfigured()) {
    const seed = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return NextResponse.json({
      url: `https://picsum.photos/seed/vn-upload-${seed}/1200/1500`,
      dev: true,
    });
  }

  try {
    const supabase = await createClient();
    const ext = file.name.split(".").pop() || "webp";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[admin] upload:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
