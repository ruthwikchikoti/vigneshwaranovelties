"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "ink" | "gold" | "ghost" | "whatsapp" | "ivory" | "link";
type Size = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

const variantClasses: Record<Variant, string> = {
  ink: "btn-base btn-ink",
  gold: "btn-base btn-gold",
  ghost: "btn-base btn-ghost",
  whatsapp: "btn-base btn-whatsapp",
  ivory: "btn-base bg-ivory text-ink border border-ink/10 hover:border-ink",
  link:
    "inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline smallcaps text-[0.7rem]",
};

const sizeClasses: Record<Size, string> = {
  sm: "py-2 px-4 text-[0.7rem]",
  md: "",
  lg: "py-5 px-8 text-[0.85rem]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ink", size = "md", fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          variantClasses[variant],
          variant !== "link" && sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export const ButtonLink = React.forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ className, variant = "ink", size = "md", fullWidth, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          variantClasses[variant],
          variant !== "link" && sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      />
    );
  }
);
ButtonLink.displayName = "ButtonLink";
