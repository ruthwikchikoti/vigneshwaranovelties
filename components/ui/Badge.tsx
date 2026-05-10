import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  variant?: "ink" | "ivory" | "gold" | "sale" | "outline";
  className?: string;
};

const styles = {
  ink: "bg-ink text-ivory",
  ivory: "bg-ivory text-ink",
  gold: "bg-champagne text-ink",
  sale: "bg-cognac text-ivory",
  outline: "border border-ink/20 text-ink bg-transparent",
};

export function Badge({ children, variant = "ink", className }: Props) {
  return (
    <span
      className={cn(
        "smallcaps text-[0.55rem] tracking-[0.2em] px-2.5 py-1 inline-block",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
