"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/lib/wishlist-store";
import { cn } from "@/lib/utils";

type Props = {
  product_id: string;
  snapshot: { title: string; price: number; image: string; slug: string };
  /** Compact icon-only style for product cards; lg variant has a label for the PDP. */
  size?: "sm" | "lg";
  className?: string;
};

export function WishlistButton({ product_id, snapshot, size = "sm", className }: Props) {
  const toggle = useWishlist((s) => s.toggle);
  // Subscribe to a derived boolean — selecting the `has` function alone never
  // re-renders because the function reference is stable.
  const savedInStore = useWishlist((s) =>
    s.items.some((i) => i.product_id === product_id)
  );

  // Hydration guard — zustand+persist reads localStorage on mount, so on first
  // server render the state is always empty. Wait for client mount before
  // exposing the saved flag to avoid a hydration mismatch.
  const t = useTranslations("wishlist");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isSaved = mounted && savedInStore;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({ product_id, snapshot });
  };

  if (size === "lg") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? t("removeLabel") : t("saveLabel")}
        className={cn(
          "btn-base btn-ghost",
          isSaved && "!border-vermilion !text-vermilion hover:!bg-vermilion-soft/40",
          className
        )}
      >
        <HeartIcon filled={isSaved} size={16} />
        {isSaved ? t("saved") : t("save")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? t("removeLabel") : t("saveLabel")}
      className={cn(
        "absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-ivory/90 backdrop-blur transition-colors",
        isSaved ? "text-vermilion" : "text-ink/55 hover:text-ink",
        className
      )}
    >
      <HeartIcon filled={isSaved} size={16} />
    </button>
  );
}

function HeartIcon({ filled, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
