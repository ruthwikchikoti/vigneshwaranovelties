import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/web-push";
import type { PushSubscriptionRecord } from "@/lib/supabase/types";

type InquirySummary = {
  customer_name: string;
  item_count: number;
};

/**
 * Send a push notification to all subscribed admin devices.
 *
 * Best-effort: logs results but never throws. Stale subscriptions
 * (404 / 410 from the push service) are automatically cleaned up.
 */
export async function notifyAdminsPush(inquiry: InquirySummary): Promise<void> {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.info("[push] VAPID keys not configured — skipping push notifications");
      return;
    }

    const supabase = createServiceClient();
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) {
      console.error("[push] Failed to read subscriptions:", error.message);
      return;
    }

    const subs = (subscriptions ?? []) as PushSubscriptionRecord[];
    if (subs.length === 0) {
      console.info("[push] No push subscriptions — skipping");
      return;
    }

    const payload = JSON.stringify({
      title: "New inquiry",
      body: `${inquiry.customer_name} — ${inquiry.item_count} item(s)`,
    });

    const vapidSubject =
      process.env.VAPID_SUBJECT ||
      (process.env.INQUIRY_NOTIFICATION_EMAIL
        ? `mailto:${process.env.INQUIRY_NOTIFICATION_EMAIL}`
        : "mailto:admin@vigneshwaranovelties.com");

    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendWebPush(
          {
            endpoint: sub.endpoint,
            key_p256dh: sub.key_p256dh,
            key_auth: sub.key_auth,
          },
          payload,
          {
            subject: vapidSubject,
            publicKey,
            privateKey,
          }
        )
      )
    );

    // Clean up stale subscriptions (404 or 410)
    const staleEndpoints: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        const { success, status, error: pushError } = result.value;
        if (success) {
          console.info(`[push] ✓ Sent to ${subs[i].endpoint.slice(0, 60)}…`);
        } else {
          console.warn(`[push] ✗ ${subs[i].endpoint.slice(0, 60)}… — ${pushError}`);
          if (status === 404 || status === 410) {
            staleEndpoints.push(subs[i].endpoint);
          }
        }
      } else {
        console.warn(`[push] ✗ ${subs[i].endpoint.slice(0, 60)}… — ${result.reason}`);
      }
    }

    // Delete stale subscriptions
    if (staleEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);

      if (deleteError) {
        console.error("[push] Failed to delete stale subscriptions:", deleteError.message);
      } else {
        console.info(`[push] Cleaned up ${staleEndpoints.length} stale subscription(s)`);
      }
    }

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    console.info(
      `[push] Done: ${succeeded}/${subs.length} delivered, ${staleEndpoints.length} stale removed`
    );
  } catch (err) {
    console.error("[push] Unexpected error:", err);
  }
}
