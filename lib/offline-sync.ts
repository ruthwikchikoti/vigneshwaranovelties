"use client";

import {
  peekInquiries,
  dequeueInquiry,
  countPendingInquiries,
} from "@/lib/inquiry-queue";
import { SYNC_TAG, CHANNEL_NAME } from "@/lib/inquiry-queue-constants";

const RETRY_INTERVAL_MS = 30_000;

/** Module-level handle so we never spin up duplicate intervals. */
let fallbackIntervalId: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Background Sync registration
// ---------------------------------------------------------------------------

/**
 * Ask the browser to fire a `sync` event with tag `replay-inquiry` the next
 * time connectivity is restored.
 *
 * Returns `true` when registration succeeds, `false` when Background Sync is
 * not supported (e.g. Firefox, Safari, or missing service worker).
 */
export async function registerInquirySync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // `.sync` is only present in browsers that support Background Sync.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (registration as any).sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Replay queue (main-thread fallback when Background Sync is unavailable)
// ---------------------------------------------------------------------------

/**
 * Walk through every queued inquiry, POST it to the API, and remove it on
 * success.
 *
 * - 2xx → dequeue (success).
 * - 429 (rate limit) → stop, retry later (transient).
 * - Other 4xx → dequeue (permanent client error; will never succeed) and
 *   notify the user via BroadcastChannel.
 * - 5xx → stop, retry later (transient server error).
 * - Network error → stop, retry later.
 *
 * After a full successful drain it broadcasts an `inquiry-synced` message so
 * the UI can update (e.g. hide a pending-badge).
 */
export async function replayQueue(): Promise<void> {
  const entries = await peekInquiries();
  if (entries.length === 0) return;

  let allSucceeded = true;
  let replayedCount = 0;

  for (const entry of entries) {
    // Strip internal queue metadata before sending to the API.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _queueId, _queuedAt, ...payload } = entry;

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await dequeueInquiry(_queueId);
        replayedCount++;
      } else if (res.status === 429) {
        // Rate-limited — transient; stop and retry later.
        allSucceeded = false;
        break;
      } else if (res.status >= 400 && res.status < 500) {
        // Permanent client error (validation, bad request, etc.) — discard
        // since replaying won't help, but notify the user.
        await dequeueInquiry(_queueId);
        replayedCount++;
        broadcastDiscarded(_queueId);
      } else {
        // 5xx — transient server error; stop and retry later.
        allSucceeded = false;
        break;
      }
    } catch {
      // Network error (offline, DNS failure, etc.) — stop immediately.
      allSucceeded = false;
      break;
    }
  }

  if (replayedCount > 0 && typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "inquiry-synced" });
    bc.close();
  }
}

/**
 * Notify the UI that a permanently-failed entry was discarded.
 */
function broadcastDiscarded(queueId: number): void {
  if (typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  bc.postMessage({ type: "inquiry-discarded", queueId });
  bc.close();
}

// ---------------------------------------------------------------------------
// Fallback interval retry (when Background Sync is unavailable)
// ---------------------------------------------------------------------------

/**
 * Start a periodic retry that fires `replayQueue()` every 30 s.
 * Automatically clears itself once the queue is empty.
 *
 * Safe to call multiple times — only one interval will be active at a time.
 */
export function startFallbackRetry(): void {
  if (typeof window === "undefined") return;
  if (fallbackIntervalId !== null) return;

  fallbackIntervalId = setInterval(async () => {
    // Skip when definitely offline to avoid unnecessary fetch errors.
    if (!navigator.onLine) return;

    await replayQueue();

    const remaining = await countPendingInquiries();
    if (remaining === 0 && fallbackIntervalId !== null) {
      clearInterval(fallbackIntervalId);
      fallbackIntervalId = null;
    }
  }, RETRY_INTERVAL_MS);
}

/**
 * Check whether there are pending inquiries and, if Background Sync is not
 * available, start the fallback retry timer.  Intended to be called once on
 * app startup (e.g. from `RegisterSW` or `PendingInquiryBanner`) so that
 * inquiries queued in a previous session are eventually replayed even when the
 * browser lacks Background Sync support.
 */
export async function ensureFallbackRetryIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;

  const pending = await countPendingInquiries().catch(() => 0);
  if (pending === 0) return;

  // If Background Sync is available the SW will handle it — no need for a
  // client-side fallback.
  const hasBgSync = await registerInquirySync();
  if (!hasBgSync) {
    startFallbackRetry();
  }
}

// ---------------------------------------------------------------------------
// Cross-tab / SW → main-thread sync notification
// ---------------------------------------------------------------------------

/**
 * Listen for `inquiry-synced` messages broadcast after a successful replay.
 *
 * @returns An unsubscribe function that closes the underlying
 *          `BroadcastChannel`.
 */
export function listenForSyncMessages(callback: () => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    // SSR or unsupported — return a no-op unsubscribe.
    return () => {};
  }

  const bc = new BroadcastChannel(CHANNEL_NAME);

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "inquiry-synced") {
      callback();
    }
  };

  bc.addEventListener("message", handler);

  return () => {
    bc.removeEventListener("message", handler);
    bc.close();
  };
}
