"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

type Variant = "danger" | "neutral";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Centered admin confirm dialog. Replaces the browser `confirm()` so the prompt
 * matches the site's typography and the destructive action is clearly tagged.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy,
  onCancel,
  onConfirm,
}: Props) {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-ink/45"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div className="relative w-full max-w-sm bg-ivory border border-ink/10 shadow-[0_24px_64px_-24px_rgba(20,28,62,0.25)] p-6 lg:p-7">
        <h2 id="confirm-dialog-title" className="font-display text-[1.4rem] text-ink leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-ink/70 mt-3 leading-relaxed">{description}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="smallcaps text-[0.65rem] px-4 py-2.5 border border-ink/15 hover:border-ink text-ink disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "smallcaps text-[0.65rem] px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-progress",
              variant === "danger"
                ? "bg-vermilion text-on-ink hover:bg-vermilion/90"
                : "bg-ink text-on-ink hover:bg-ink-soft"
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
