"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { countPendingInquiries } from "@/lib/inquiry-queue";
import { listenForSyncMessages } from "@/lib/offline-sync";

export function PendingInquiryBanner() {
  const t = useTranslations("inquiry");
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Check on mount
    countPendingInquiries().then(setCount).catch(() => {});

    // Listen for sync completion
    const unsubscribe = listenForSyncMessages(() => {
      setCount(0);
    });

    // Also re-check when the tab becomes visible (user may have been away)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        countPendingInquiries().then(setCount).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      unsubscribe();
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
