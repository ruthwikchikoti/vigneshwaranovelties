import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";

export const runtime = "edge";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  key_p256dh: z.string().min(1),
  key_auth: z.string().min(1),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: parsed.data.endpoint,
        key_p256dh: parsed.data.key_p256dh,
        key_auth: parsed.data.key_auth,
        user_id: user.id,
      },
      { onConflict: "endpoint" }
    );
    if (error) throw error;
  } catch (err) {
    console.error("[admin] push subscription upsert:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", parsed.data.endpoint)
      .eq("user_id", user.id);
    if (error) throw error;
  } catch (err) {
    console.error("[admin] push subscription delete:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
