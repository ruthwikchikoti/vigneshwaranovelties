/* Vigneshwara Novelties - minimal offline service worker.
 *
 * What it does:
 *   - Precaches the home page + brand icons on install
 *   - Network-first for HTML (public storefront only; admin is not intercepted)
 *   - Cache-first for /brand/* and /_next/static/* (immutable, hashed)
 *
 * What it intentionally doesn't do:
 *   - Cache API responses (those depend on auth + live data)
 *   - Push notifications, periodic sync
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

/* ------------------------------------------------------------------ *
 *  Background Sync — replay queued inquiry submissions               *
 *                                                                    *
 *  When the browser fires a "sync" event with tag "replay-inquiry",  *
 *  we read every pending inquiry from IndexedDB and POST it to the   *
 *  server. Successful or permanently-failed entries are deleted;      *
 *  transient failures cause the sync to retry later.                 *
 * ------------------------------------------------------------------ */

// --- Inline IndexedDB helpers (must match lib/inquiry-queue.ts schema) ---

const IDB_NAME = "vn-inquiry-queue";
const IDB_VERSION = 1;
const IDB_STORE = "pending";

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
 * Read every record from the "pending" object store using a cursor.
 * Returns a promise that resolves with an array of records.
 */
function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const results = [];
    const cursor = store.openCursor();
    cursor.onsuccess = (event) => {
      const c = event.target.result;
      if (c) {
        results.push(c.value);
        c.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

/**
 * Delete a single record from the "pending" store by its _queueId key.
 */
function deletePending(db, queueId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete(queueId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Sync event listener ---

self.addEventListener("sync", (event) => {
  if (event.tag === "replay-inquiry") {
    event.waitUntil(replayQueueFromSW());
  }
});

// --- Replay logic ---

async function replayQueueFromSW() {
  const db = await openInquiryDB();
  const entries = await getAllPending(db);

  if (entries.length === 0) return;

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
      // Network error — throw so the browser retries the sync later.
      throw new Error("Network error during inquiry replay — will retry.");
    }

    if (response.ok) {
      // 2xx — successfully submitted; remove from queue.
      await deletePending(db, entry._queueId);
    } else if (response.status >= 400 && response.status < 500) {
      // 4xx — validation / client error; will never succeed, so discard.
      await deletePending(db, entry._queueId);
    } else {
      // 5xx — server error; throw so the browser retries the sync later.
      throw new Error(
        `Server returned ${response.status} during inquiry replay — will retry.`
      );
    }
  }

  // All entries processed — notify any open tabs.
  const channel = new BroadcastChannel("vn-inquiry-sync");
  channel.postMessage({ type: "inquiry-synced" });
  channel.close();
}
