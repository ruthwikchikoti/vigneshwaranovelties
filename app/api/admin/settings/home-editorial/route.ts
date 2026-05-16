import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/auth";
import { setHomeEditorial } from "@/lib/admin/settings";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

const schema = z.object({
  image_url: z.string().url("Please pick or upload a valid image"),
});

export async function PUT(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await setHomeEditorial(parsed.data);
    revalidateCache(CACHE_TAGS.settings);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] home_editorial save:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
