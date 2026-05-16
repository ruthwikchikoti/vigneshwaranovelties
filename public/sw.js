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
 *   - Background sync, periodic sync
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
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
