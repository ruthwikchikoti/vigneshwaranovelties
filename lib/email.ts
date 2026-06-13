import "server-only";

/**
 * Email backend — Brevo HTTP API.
 *
 * Why Brevo: works on any runtime (Node + edge), free tier 300/day,
 * no custom domain required. The sender email just needs a one-click verification
 * in the Brevo dashboard (a personal gmail works).
 *
 * Env vars:
 *   BREVO_API_KEY              — from https://app.brevo.com/settings/keys/api
 *   BREVO_FROM_EMAIL           — verified sender address (e.g. vigneshwaranovelties@gmail.com)
 *   BREVO_FROM_NAME            — display name (defaults to "Vigneshwara Novelties")
 *   INQUIRY_NOTIFICATION_EMAIL — where inquiry notifications are delivered
 */

type Item = {
  qty: number;
  snapshot: { title: string; price: number };
};

type Inquiry = {
  customer_name: string;
  mobile: string;
  address: string | null;
  message: string | null;
  items: Item[];
  source: string;
};

export type EmailResult =
  | { sent: true; provider: "brevo"; messageId?: string }
  | { sent: false; reason: string };

const isBrevoConfigured = () =>
  Boolean(
    process.env.BREVO_API_KEY &&
      !process.env.BREVO_API_KEY.includes("placeholder") &&
      process.env.BREVO_FROM_EMAIL &&
      process.env.INQUIRY_NOTIFICATION_EMAIL
  );

export async function sendInquiryEmail(inquiry: Inquiry): Promise<EmailResult> {
  if (!isBrevoConfigured()) {
    const missing: string[] = [];
    if (!process.env.BREVO_API_KEY) missing.push("BREVO_API_KEY");
    if (!process.env.BREVO_FROM_EMAIL) missing.push("BREVO_FROM_EMAIL");
    if (!process.env.INQUIRY_NOTIFICATION_EMAIL) missing.push("INQUIRY_NOTIFICATION_EMAIL");
    const reason = `Email not sent — missing env: ${missing.join(", ")}`;
    console.warn("[inquiry email]", reason);
    return { sent: false, reason };
  }

  const itemCount = inquiry.items.reduce((s, i) => s + i.qty, 0);
  const html = renderEmailHtml(inquiry, itemCount);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM_EMAIL!,
          name: process.env.BREVO_FROM_NAME ?? "Vigneshwara Novelties",
        },
        to: [{ email: process.env.INQUIRY_NOTIFICATION_EMAIL! }],
        replyTo: { email: process.env.INQUIRY_NOTIFICATION_EMAIL! },
        subject: `New inquiry — ${inquiry.customer_name} — ${itemCount} item${itemCount > 1 ? "s" : ""}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const reason = `Brevo returned ${res.status}: ${text || res.statusText}`;
      console.error("[inquiry email]", reason);
      return { sent: false, reason };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    console.info(`[inquiry email] sent → ${process.env.INQUIRY_NOTIFICATION_EMAIL} (${data.messageId ?? "no id"})`);
    return { sent: true, provider: "brevo", messageId: data.messageId };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[inquiry email] fetch failed:", reason);
    return { sent: false, reason };
  }
}

function renderEmailHtml(inquiry: Inquiry, itemCount: number): string {
  const itemRows = inquiry.items
    .map(
      (it) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #EFE6D2">${escapeHtml(it.snapshot.title)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #EFE6D2;text-align:center">${it.qty}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #EFE6D2;text-align:right">₹${it.snapshot.price.toLocaleString("en-IN")}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;background:#F6EFE0;padding:32px;color:#1B2A5B">
      <h1 style="font-family:Georgia,serif;font-size:28px;margin:0 0 8px 0">New inquiry</h1>
      <p style="color:#8B6422;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 24px 0">Vigneshwara Novelties</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:24px 0">
        <tr><td style="padding:8px 0;color:#666;width:120px">Name</td><td style="padding:8px 0;font-weight:500">${escapeHtml(inquiry.customer_name)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Mobile</td><td style="padding:8px 0;font-weight:500"><a href="tel:+91${inquiry.mobile}" style="color:#1B2A5B">+91 ${escapeHtml(inquiry.mobile)}</a> · <a href="https://wa.me/91${inquiry.mobile}" style="color:#25D366">WhatsApp</a></td></tr>
        ${inquiry.address ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Address</td><td style="padding:8px 0">${escapeHtml(inquiry.address)}</td></tr>` : ""}
        ${inquiry.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="padding:8px 0">${escapeHtml(inquiry.message)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#666">Source</td><td style="padding:8px 0">${escapeHtml(inquiry.source)}</td></tr>
      </table>
      <h2 style="font-family:Georgia,serif;font-size:18px;margin:32px 0 8px 0">Items (${itemCount})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#EFE6D2">
            <th style="padding:8px;text-align:left;font-weight:500">Product</th>
            <th style="padding:8px;text-align:center;font-weight:500">Qty</th>
            <th style="padding:8px;text-align:right;font-weight:500">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p style="margin-top:32px;font-size:12px;color:#8B6422">Reply within a few hours via WhatsApp or call. The customer is waiting for you.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
