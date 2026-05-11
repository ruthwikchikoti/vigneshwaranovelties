"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";

type Props = {
  title: string;
  slug: string;
  price: number;
  locale: "en" | "te";
};

export function ShareProduct({ title, slug, price, locale }: Props) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${locale === "te" ? "/te" : ""}/product/${slug}`
      : `/product/${slug}`;
  const priceLabel = `₹${price.toLocaleString("en-IN")}`;
  const message =
    locale === "te"
      ? `${title}\nధర: ${priceLabel}\n${url}`
      : `${title}\nPrice: ${priceLabel}\n${url}`;

  const onWhatsApp = () => {
    // Use the Web Share API where available — it gives the user a full
    // platform share sheet (WhatsApp, Messages, AirDrop, etc.). Fall back to
    // a direct wa.me deep-link on desktop / unsupported clients.
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title, text: message, url })
        .catch(() => {
          // User cancelled or share failed silently — fall through to wa.me
          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        });
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Last-resort fallback for very old browsers.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const btnClass =
    "inline-flex items-center gap-2 px-4 py-2.5 border text-[0.75rem] smallcaps text-ink transition-colors";

  return (
    <div className="flex flex-col gap-3">
      <p className="smallcaps text-[0.55rem] text-ink/50">Share this piece</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onWhatsApp}
          className={cn(btnClass, "border-[#25D366]/40 hover:bg-[#25D366]/5 hover:border-[#25D366]")}
        >
          <IconWhatsapp size={14} />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            btnClass,
            copied
              ? "border-peacock text-peacock bg-peacock/5"
              : "border-ink/15 hover:border-ink"
          )}
        >
          {copied ? "✓ Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
