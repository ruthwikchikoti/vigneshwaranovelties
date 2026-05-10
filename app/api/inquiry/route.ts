import { NextResponse } from "next/server";
import { Resend } from "resend";
import { inquirySchema } from "@/lib/validations/inquiry";
import { createServiceClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export const runtime = "nodejs";

const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

const isResendConfigured = () =>
  Boolean(
    process.env.RESEND_API_KEY &&
      !process.env.RESEND_API_KEY.includes("placeholder")
  );

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Honeypot — if filled, silently accept (bot)
  if (parsed.data.hp) {
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
  };

  // 1. Persist to Supabase (if configured) — otherwise log to console for dev
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from("inquiries").insert(inquiry);
      if (error) throw error;
    } catch (err) {
      console.error("[inquiry] Supabase insert failed:", err);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  } else {
    console.info("[inquiry] (dev / no Supabase)", JSON.stringify(inquiry, null, 2));
  }

  // 2. Email notification via Resend
  if (isResendConfigured() && process.env.INQUIRY_NOTIFICATION_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      const itemCount = inquiry.items.reduce((s, i) => s + i.qty, 0);
      const itemRows = inquiry.items
        .map(
          (it) =>
            `<tr><td style="padding:8px;border-bottom:1px solid #E5DECC">${it.snapshot.title}</td>` +
            `<td style="padding:8px;border-bottom:1px solid #E5DECC;text-align:center">${it.qty}</td>` +
            `<td style="padding:8px;border-bottom:1px solid #E5DECC;text-align:right">₹${it.snapshot.price.toLocaleString("en-IN")}</td></tr>`
        )
        .join("");

      await resend.emails.send({
        from: process.env.INQUIRY_FROM_EMAIL ?? "inquiries@vigneshwaranovelties.com",
        to: process.env.INQUIRY_NOTIFICATION_EMAIL,
        subject: `New inquiry — ${inquiry.customer_name} — ${itemCount} item${itemCount > 1 ? "s" : ""}`,
        html: `
          <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:#F6F1E7;padding:32px;color:#0F0E0C">
            <h1 style="font-family:Georgia,serif;font-size:28px;margin:0 0 8px 0">New inquiry</h1>
            <p style="color:#8C6E2A;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 24px 0">Vigneshwara Novelties</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0">
              <tr><td style="padding:8px 0;color:#666;width:120px">Name</td><td style="padding:8px 0;font-weight:500">${inquiry.customer_name}</td></tr>
              <tr><td style="padding:8px 0;color:#666">Mobile</td><td style="padding:8px 0;font-weight:500"><a href="tel:+91${inquiry.mobile}" style="color:#0F0E0C">+91 ${inquiry.mobile}</a> · <a href="https://wa.me/91${inquiry.mobile}" style="color:#25D366">WhatsApp</a></td></tr>
              ${inquiry.address ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Address</td><td style="padding:8px 0">${inquiry.address}</td></tr>` : ""}
              ${inquiry.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="padding:8px 0">${inquiry.message}</td></tr>` : ""}
              <tr><td style="padding:8px 0;color:#666">Source</td><td style="padding:8px 0">${inquiry.source}</td></tr>
            </table>
            <h2 style="font-family:Georgia,serif;font-size:18px;margin:32px 0 8px 0">Items (${itemCount})</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#E5DECC">
                  <th style="padding:8px;text-align:left;font-weight:500">Product</th>
                  <th style="padding:8px;text-align:center;font-weight:500">Qty</th>
                  <th style="padding:8px;text-align:right;font-weight:500">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <p style="margin-top:32px;font-size:12px;color:#8C6E2A">Reply within a few hours via WhatsApp or call. The customer is waiting for you.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[inquiry] Resend send failed:", err);
      // Email failure shouldn't fail the whole request — inquiry is already saved
    }
  } else {
    console.info(`[inquiry] (no Resend) — would email ${process.env.INQUIRY_NOTIFICATION_EMAIL ?? "owner"} about ${inquiry.customer_name}`);
  }

  return NextResponse.json({ ok: true });
}
