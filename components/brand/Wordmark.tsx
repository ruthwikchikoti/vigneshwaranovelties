import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "ink" | "ivory";
  withSubmark?: boolean;
};

export function Wordmark({ className, variant = "ink", withSubmark = false }: Props) {
  const color = variant === "ink" ? "text-ink" : "text-ivory";
  return (
    <span className={cn("inline-flex flex-col items-center gap-1", className)}>
      <span
        className={cn(
          "font-display text-[1.5rem] sm:text-[1.75rem] leading-none tracking-tight",
          color
        )}
      >
        Vigneshwara
      </span>
      <span
        className={cn(
          "smallcaps text-[0.55rem] sm:text-[0.65rem]",
          variant === "ink" ? "text-champagne-deep" : "text-champagne"
        )}
      >
        Novelties
      </span>
      {withSubmark ? (
        <span className={cn("smallcaps text-[0.5rem] mt-1", color, "opacity-50")}>
          Est. 1998
        </span>
      ) : null}
    </span>
  );
}
