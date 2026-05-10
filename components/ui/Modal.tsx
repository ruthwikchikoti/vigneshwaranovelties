"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { IconClose } from "@/components/ui/Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, children, title, size = "md" }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease]"
        onClick={onClose}
        style={{ animation: "fadeIn 0.3s ease" }}
      />
      <div
        className={cn(
          "relative w-full bg-ivory shadow-2xl flex flex-col",
          "max-h-[92vh] sm:max-h-[88vh] overflow-hidden",
          "rounded-t-2xl sm:rounded-none",
          sizes[size],
          "animate-[slideUp_0.4s_cubic-bezier(0.22,1,0.36,1)]"
        )}
        style={{ animation: "slideUp 0.4s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {(title || true) && (
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-ink/10">
            {title ? (
              <h2 className="font-display text-[1.5rem] sm:text-[1.75rem] text-ink">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-ink"
              aria-label="Close"
            >
              <IconClose />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 sm:py-8">{children}</div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
      `}</style>
    </div>
  );
}
