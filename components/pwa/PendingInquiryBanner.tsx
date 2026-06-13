"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { countPendingInquiries } from "@/lib/inquiry-queue";
import { listenForSyncMessages, ensureFallbackRetryIfNeeded } from "@/lib/offline-sync";

export function PendingInquiryBanner() {
  const t = useTranslations("inquiry");
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refreshCount = () => {
      countPendingInquiries().then(setCount).catch(() => {});
    };

    // Check on mount
    refreshCount();

    // If there are pending inquiries and Background Sync is unavailable, start
    // the fallback retry timer so entries from a previous session are replayed.
    ensureFallbackRetryIfNeeded().catch(() => {});

    // Listen for sync completion (SW or main-thread replay succeeded)
    const unsubscribe = listenForSyncMessages(() => {
      refreshCount();
    });

    // Listen for new items being enqueued from InquiryForm — the layout is
    // preserved across client-side navigations so we can't rely on remount.
    const onInquiryQueued = () => refreshCount();
    window.addEventListener("inquiry-queued", onInquiryQueued);

    // Re-check when the tab becomes visible (user may have been away)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCount();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
      window.removeEventListener("inquiry-queued", onInquiryQueued);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (count === 0) return null;

  const message = count === 1 ? t("pendingBannerOne") : t("pendingBanner", { count });

  return (
    <div className="bg-champagne/10 border-b border-champagne/20 px-4 py-2.5 text-center">
      <p className="text-xs text-champagne-deep leading-relaxed">
        {message}
      </p>
    </div>
  );
}
