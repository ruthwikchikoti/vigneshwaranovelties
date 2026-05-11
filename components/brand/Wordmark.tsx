import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

/* Wordmark is just an alias for the Logo now (kept for backwards-compat). */
export function Wordmark({
  className,
  variant = "ink",
}: {
  className?: string;
  variant?: "ink" | "ivory";
  withSubmark?: boolean;
}) {
  return <Logo className={cn(className)} variant={variant} />;
}
