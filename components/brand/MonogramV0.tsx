import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "ink" | "ivory" | "champagne";
  size?: number;
};

/* "VN" monogram — for favicon, mobile header, app icon */
export function MonogramV0({ className, variant = "ink", size = 48 }: Props) {
  const fg = variant === "ink" ? "var(--ink)" : variant === "ivory" ? "var(--ivory)" : "var(--champagne)";
  const accent = variant === "ink" ? "var(--champagne)" : "var(--champagne)";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("select-none", className)}
      role="img"
      aria-label="Vigneshwara Novelties monogram"
    >
      {/* Outer beaded circle */}
      <circle cx="32" cy="32" r="30" fill="none" stroke={fg} strokeWidth="0.5" opacity="0.5" />
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i * 360) / 24 - 90;
        const rad = (angle * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={32 + Math.cos(rad) * 28}
            cy={32 + Math.sin(rad) * 28}
            r="0.8"
            fill={fg}
          />
        );
      })}

      {/* V — left stroke */}
      <path
        d="M 18 22 L 26 44 L 30 44"
        fill="none"
        stroke={fg}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* V — right stroke (shared apex) */}
      <path
        d="M 30 44 L 34 36"
        fill="none"
        stroke={fg}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* V serif top-left */}
      <path d="M 16 22 L 20 22" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />

      {/* N */}
      <path
        d="M 34 44 L 34 22 L 46 42 L 46 22"
        fill="none"
        stroke={fg}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* N serifs */}
      <path d="M 32 22 L 36 22" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 44 22 L 48 22" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 32 44 L 36 44" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 44 44 L 48 44" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />

      {/* Gold accent dot under monogram */}
      <circle cx="32" cy="50" r="1.2" fill={accent} />
    </svg>
  );
}
