"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(Boolean(sub));
      });
    });
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!p256dh || !auth) {
        await sub.unsubscribe();
        throw new Error("Browser did not provide push encryption keys");
      }

      const res = await fetch("/api/admin/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          key_p256dh: p256dh,
          key_auth: auth,
        }),
      });

      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error(`Server returned ${res.status}`);
      }

      setSubscribed(true);
      setPermission(Notification.permission);
    } catch (err) {
      if (Notification.permission === "denied") {
        setPermission("denied");
      } else {
        console.error("Push subscription failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/admin/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-ink/75">
        Push notifications are not supported on this browser.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-ink/75">
        Notifications are blocked — update your browser or device settings to allow them.
      </p>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink/75">
          Push notifications are active on this device.
          <span className="text-peacock smallcaps text-[0.55rem] tracking-[0.18em] ml-2">
            Active
          </span>
        </p>
        <button
          onClick={disable}
          disabled={loading}
          className="text-sm text-ink/50 hover:text-ink transition-colors underline underline-offset-2 self-start disabled:opacity-50"
        >
          {loading ? "Disabling..." : "Disable"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={loading}
      className="bg-ink text-ivory px-4 py-2 text-sm hover:bg-ink/90 transition-colors disabled:opacity-50"
    >
      {loading ? "Enabling..." : "Enable push notifications"}
    </button>
  );
}
