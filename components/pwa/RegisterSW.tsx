"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Register on idle so it doesn't compete with the initial page paint.
    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1000);

    idle(() => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Force an update check so existing installs pick up new SW handlers
          // (e.g. the push/notificationclick listeners) without waiting on the
          // browser's own heuristic.
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[pwa] service worker registration failed:", err);
        });
    });
  }, []);

  return null;
}
