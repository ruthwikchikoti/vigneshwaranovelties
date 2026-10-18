import { NextResponse } from "next/server";
import { inquirySchema } from "@/lib/validations/inquiry";
import { createServiceClient } from "@/lib/supabase/server";
import { sendInquiryEmail } from "@/lib/email";
import { notifyAdminsPush } from "@/lib/push-notify";
import { log } from "@/lib/observability/log";
import { metrics } from "@/lib/observability/metrics";


const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    metrics.inquiries.inc({ result: "invalid" });
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    metrics.inquiries.inc({ result: "invalid" });
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Honeypot — if filled, silently accept (bot)
  if (parsed.data.hp) {
    metrics.inquiries.inc({ result: "spam" });
    return NextResponse.json({ ok: true });
  }

  const inquiry = {
    customer_name: parsed.data.customer_name,
    mobile: parsed.data.mobile,
    address: parsed.data.address || null,
    message: parsed.data.message || null,
    items: parsed.data.items,
    source: parsed.data.source,
    status: "new" as const,
    idempotency_key: parsed.data.idempotency_key ?? null,
  };

  // 1. Persist to Supabase (if configured) — otherwise log to console for dev
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from("inquiries").insert(inquiry);
      if (error) {
        // Duplicate replay (same idempotency_key) — the original was already
        // saved + emailed, so ACK with 200 so the client clears its queue and
        // we do NOT email/push again.
        if (error.code === "23505") {
          metrics.inquiries.inc({ result: "duplicate" });
          return NextResponse.json({ ok: true, duplicate: true });
        }
        throw error;
      }
    } catch (err) {
      metrics.inquiries.inc({ result: "error" });
      log.error("inquiry insert failed", { err });
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  } else {
    console.info("[inquiry] (dev / no Supabase)", JSON.stringify(inquiry, null, 2));
  }

  // 2. Fire-and-forget the notification email. Failures are logged and
  // surfaced in the response so admins can spot misconfiguration, but they
  // never block the customer — the inquiry is already persisted.
  const itemCount = inquiry.items.reduce((s, i) => s + i.qty, 0);

  // 3. Push notification to admin devices — truly fire-and-forget so a
  //    slow / unreachable push service never delays the customer response.
  notifyAdminsPush({ customer_name: inquiry.customer_name, item_count: itemCount })
    .catch((err) => log.error("admin push notification failed", { err }));

  const emailResult = await sendInquiryEmail(inquiry);
  metrics.notifications.inc({ channel: "email", result: emailResult.sent ? "sent" : "failed" });

  metrics.inquiries.inc({ result: "saved" });
  log.info("inquiry saved", { source: inquiry.source, items: itemCount, email: emailResult });

  return NextResponse.json({ ok: true, email: emailResult });
}
