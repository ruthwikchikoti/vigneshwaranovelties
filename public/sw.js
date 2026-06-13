"use strict";

/* Vigneshwara Novelties - offline + push service worker.
 *
 * What it does:
 *   - Precaches the home page + brand icons on install
 *   - Network-first for HTML (public storefront only; admin is not intercepted)
 *   - Cache-first for /brand/* and /_next/static/* (immutable, hashed)
 *   - Receives push notifications and shows them to the user
 *
 * What it intentionally doesn't do:
 *   - Cache API responses (those depend on auth + live data)
 *   - Periodic background sync
 */

const CACHE = "vn-v4";
const PRECACHE = [
  "/",
  "/shop",
  "/brand/seal.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(PRECACHE);
      } catch {
        // Best-effort: if precache fetches fail (e.g. offline at install), we skip.
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API requests - auth and freshness matter.
  if (url.pathname.startsWith("/api/")) return;

  // Do not intercept admin (avoid caching authenticated HTML / RSC).
  if (url.pathname.startsWith("/admin")) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/fonts/");

  if (isStatic) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // For HTML/navigation requests, prefer the network but fall back to cache
  // (so the start_url works when the device is offline).
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    const home = await cache.match("/");
    if (home) return home;
    return new Response("You're offline.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/* ── Push notifications ─────────────────────────────────── */

self.addEventListener("push", (event) => {
  let title = "New inquiry";
  let body = "A customer just submitted an inquiry.";
  let data = {};

  if (event.data) {
    try {
      const json = event.data.json();
      title = json.title || title;
      body = json.body || body;
      data = json.data || {};
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/brand/seal.png",
      badge: "/brand/seal.png",
      tag: "inquiry",
      renotify: true,
      data: { url: "/admin/inquiries", ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/inquiries";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/admin") && "focus" in client) {
          return client.navigate(url).then(() => client.focus());
        }
      }
      return clients.openWindow(url);
    })
  );
});

/* ------------------------------------------------------------------ *
 *  Background Sync — replay queued inquiry submissions               *
 *                                                                    *
 *  When the browser fires a "sync" event with tag "replay-inquiry",  *
 *  we read every pending inquiry from IndexedDB and POST it to the   *
 *  server. Successful or permanently-failed entries are deleted;      *
 *  transient failures cause the sync to retry later.                 *
 * ------------------------------------------------------------------ */

// --- Inline IndexedDB helpers ---
//
// These constants MUST match `lib/inquiry-queue-constants.ts`.  Service
// workers cannot import TS modules, so the values are duplicated here.
// If you change the schema, update both places.

const IDB_NAME = "vn-inquiry-queue";
const IDB_VERSION = 1;
const IDB_STORE = "pending";
const SYNC_TAG = "replay-inquiry";
const CHANNEL_NAME = "vn-inquiry-sync";

/**
 * Open (or create) the vn-inquiry-queue IndexedDB database.
 * Returns a promise that resolves with the db instance.
 */
function openInquiryDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, {
          keyPath: "_queueId",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read every record from the "pending" object store.
 * Returns a promise that resolves with an array of records.
 */
function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.getAll();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete a single record from the "pending" store by its _queueId key.
 */
function deletePending(db, queueId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.delete(queueId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Sync event listener ---

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(replayQueueFromSW());
  }
});

// --- Replay logic ---

async function replayQueueFromSW() {
  const db = await openInquiryDB();
  let entries;
  try {
    entries = await getAllPending(db);
  } catch (err) {
    db.close();
    throw err;
  }

  if (entries.length === 0) {
    db.close();
    return;
  }

  let replayedCount = 0;

  for (const entry of entries) {
    // Strip internal queue metadata before sending to the server.
    const cleaned = { ...entry };
    delete cleaned._queueId;
    delete cleaned._queuedAt;

    let response;
    try {
      response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
    } catch (_networkError) {
      // Network error — close db and throw so the browser retries later.
      db.close();
      throw new Error("Network error during inquiry replay — will retry.");
    }

    if (response.ok) {
      // 2xx — successfully submitted; remove from queue.
      await deletePending(db, entry._queueId);
      replayedCount++;
    } else if (response.status === 429) {
      // Rate-limited — transient; throw so the browser retries later.
      db.close();
      throw new Error("Rate-limited (429) during inquiry replay — will retry.");
    } else if (response.status >= 400 && response.status < 500) {
      // Permanent client error (validation, bad request, etc.) — discard
      // since replaying won't fix it, but notify the user.
      await deletePending(db, entry._queueId);
      replayedCount++;
      notifyDiscarded(entry._queueId);
    } else {
      // 5xx — server error; throw so the browser retries the sync later.
      db.close();
      throw new Error(
        `Server returned ${response.status} during inquiry replay — will retry.`
      );
    }
  }

  db.close();

  // Notify open tabs only if we actually processed entries.
  if (replayedCount > 0) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "inquiry-synced" });
    channel.close();
  }
}

/**
 * Notify the UI that a permanently-failed entry was discarded.
 */
function notifyDiscarded(queueId) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "inquiry-discarded", queueId });
    channel.close();
  } catch {
    // BroadcastChannel may not be available — ignore.
  }
}
