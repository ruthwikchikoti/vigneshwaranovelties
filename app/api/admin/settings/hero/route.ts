import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/auth";
import { setHeroSettings, HERO_MIN, HERO_MAX } from "@/lib/admin/settings";

export const runtime = "edge";

const schema = z.object({
  rotation_seconds: z.coerce
    .number()
    .int()
    .min(HERO_MIN, `Must be at least ${HERO_MIN} seconds`)
    .max(HERO_MAX, `Must be no more than ${HERO_MAX} seconds`),
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
    await setHeroSettings(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] hero settings save:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
