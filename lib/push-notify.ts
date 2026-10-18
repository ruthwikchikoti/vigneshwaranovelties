import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/observability/log";
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
      log.info("push skipped: VAPID keys not configured");
      return;
    }

    // Service-role client is required here: it bypasses RLS so we can read
    // all subscriptions for broadcast delivery. The anon client would return
    // zero rows because the RLS policy scopes to auth.uid().
    const supabase = createServiceClient();
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) {
      log.error("push: failed to read subscriptions", { err: error.message });
      return;
    }

    const subs = (subscriptions ?? []) as PushSubscriptionRecord[];
    if (subs.length === 0) {
      log.info("push skipped: no subscriptions");
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
          log.info("push sent", { endpoint: subs[i].endpoint.slice(0, 60) });
        } else {
          log.warn("push failed", { endpoint: subs[i].endpoint.slice(0, 60), status, reason: pushError });
          if (status === 404 || status === 410) {
            staleEndpoints.push(subs[i].endpoint);
          }
        }
      } else {
        log.warn("push failed", { endpoint: subs[i].endpoint.slice(0, 60), err: result.reason });
      }
    }

    // Delete stale subscriptions
    if (staleEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);

      if (deleteError) {
        log.error("push: failed to delete stale subscriptions", { err: deleteError.message });
      } else {
        log.info("push: removed stale subscriptions", { count: staleEndpoints.length });
      }
    }

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    log.info("push done", { delivered: succeeded, total: subs.length, stale: staleEndpoints.length });
  } catch (err) {
    log.error("push: unexpected error", { err });
  }
}
