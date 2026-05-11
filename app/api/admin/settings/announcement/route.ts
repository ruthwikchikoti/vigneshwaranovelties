import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/auth";
import { setAnnouncement } from "@/lib/admin/settings";

export const runtime = "edge";

const schema = z.object({
  text_en: z.string().trim().min(1, "English text is required").max(240, "Keep under 240 characters"),
  text_te: z.string().trim().max(240, "Keep under 240 characters").default(""),
  enabled: z.boolean(),
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
    await setAnnouncement(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] announcement save:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
