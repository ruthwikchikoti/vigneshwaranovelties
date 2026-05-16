"use client";

import {
  peekInquiries,
  dequeueInquiry,
  countPendingInquiries,
} from "@/lib/inquiry-queue";

const SYNC_TAG = "replay-inquiry";
const CHANNEL_NAME = "vn-inquiry-sync";
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
// Replay queue (used by both the fallback timer and the service-worker)
// ---------------------------------------------------------------------------

/**
 * Walk through every queued inquiry, POST it to the API, and remove it on
 * success.  Stops at the **first network error** so we don't burn mobile data
 * on a flaky connection.
 *
 * After a full successful drain it broadcasts an `inquiry-synced` message so
 * the UI can update (e.g. hide a pending-badge).
 */
export async function replayQueue(): Promise<void> {
  const entries = await peekInquiries();
  if (entries.length === 0) return;

  let allSucceeded = true;

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
      } else {
        // Server returned a non-2xx status — stop to avoid repeated failures.
        allSucceeded = false;
        break;
      }
    } catch {
      // Network error (offline, DNS failure, etc.) — stop immediately.
      allSucceeded = false;
      break;
    }
  }

  if (allSucceeded && typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ type: "inquiry-synced" });
    bc.close();
  }
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
    await replayQueue();

    const remaining = await countPendingInquiries();
    if (remaining === 0 && fallbackIntervalId !== null) {
      clearInterval(fallbackIntervalId);
      fallbackIntervalId = null;
    }
  }, RETRY_INTERVAL_MS);
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
