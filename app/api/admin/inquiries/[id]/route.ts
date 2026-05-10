import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "completed", "spam"]).optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 422 });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "contacted") {
    updates.contacted_at = new Date().toISOString();
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("inquiries").update(updates).eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.error("[admin] inquiry update:", err);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
