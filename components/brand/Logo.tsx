import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "ink" | "ivory" | "champagne";
  size?: number;
};

/*
 * Vigneshwara Novelties — circular emblem.
 * Inspired by the original Ganesha-emblem the family uses, refined in Modern Heirloom palette:
 * a beaded outer ring, a stylized seated deity silhouette, lotus motifs at base,
 * and arched typography above and below.
 */
export function Logo({ className, variant = "ink", size = 220 }: Props) {
  const stroke = variant === "ink" ? "var(--ink)" : variant === "ivory" ? "var(--ivory)" : "var(--champagne)";
  const fill = variant === "ink" ? "var(--ink)" : variant === "ivory" ? "var(--ivory)" : "var(--champagne)";
  const surface = variant === "ink" ? "var(--ivory)" : "transparent";

  // Generate beaded outer ring
  const beads = Array.from({ length: 60 }, (_, i) => {
    const angle = (i * 360) / 60 - 90;
    const rad = (angle * Math.PI) / 180;
    const cx = 110 + Math.cos(rad) * 100;
    const cy = 110 + Math.sin(rad) * 100;
    return <circle key={i} cx={cx} cy={cy} r="1.6" fill={fill} />;
  });

  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      className={cn("select-none", className)}
      role="img"
      aria-label="Vigneshwara Novelties"
    >
      <defs>
        <path
          id="vn-arc-top"
          d="M 30,110 A 80,80 0 0 1 190,110"
          fill="none"
        />
        <path
          id="vn-arc-bottom"
          d="M 35,118 A 75,75 0 0 0 185,118"
          fill="none"
        />
      </defs>

      {/* Background fill (only when ink variant on dark surfaces) */}
      <circle cx="110" cy="110" r="106" fill={surface} />

      {/* Outer hairline */}
      <circle
        cx="110"
        cy="110"
        r="105"
        fill="none"
        stroke={stroke}
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* Beaded ring */}
      {beads}

      {/* Inner thin ring */}
      <circle
        cx="110"
        cy="110"
        r="92"
        fill="none"
        stroke={stroke}
        strokeWidth="0.4"
        opacity="0.4"
      />

      {/* Arched top text — VIGNESHWARA */}
      <text
        fontFamily="var(--font-display), serif"
        fontSize="13"
        fontWeight="500"
        letterSpacing="3.5"
        fill={fill}
      >
        <textPath href="#vn-arc-top" startOffset="50%" textAnchor="middle">
          VIGNESHWARA
        </textPath>
      </text>

      {/* Arched bottom text — NOVELTIES */}
      <text
        fontFamily="var(--font-display), serif"
        fontSize="11"
        fontWeight="500"
        letterSpacing="6"
        fill={fill}
      >
        <textPath href="#vn-arc-bottom" startOffset="50%" textAnchor="middle">
          NOVELTIES
        </textPath>
      </text>

      {/* Decorative laurel - left */}
      <g stroke={stroke} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M 38,110 Q 50,90 50,75" />
        <path d="M 42,108 Q 50,100 56,98" />
        <path d="M 44,114 Q 52,114 60,108" />
        <path d="M 44,120 Q 54,124 62,120" />
        <path d="M 42,126 Q 52,134 56,138" />
        <path d="M 38,128 Q 50,140 50,155" />
      </g>

      {/* Decorative laurel - right (mirror) */}
      <g stroke={stroke} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.85">
        <path d="M 182,110 Q 170,90 170,75" />
        <path d="M 178,108 Q 170,100 164,98" />
        <path d="M 176,114 Q 168,114 160,108" />
        <path d="M 176,120 Q 166,124 158,120" />
        <path d="M 178,126 Q 168,134 164,138" />
        <path d="M 182,128 Q 170,140 170,155" />
      </g>

      {/* Stylized seated Ganesha silhouette — geometric interpretation */}
      <g fill={fill} opacity="0.92">
        {/* Crown / mukut */}
        <path d="M 102,68 Q 110,58 118,68 L 116,76 L 104,76 Z" />
        <circle cx="110" cy="62" r="1.6" />

        {/* Head (circular) */}
        <ellipse cx="110" cy="86" rx="14" ry="12" />

        {/* Ears - large fan shape */}
        <path d="M 92,82 Q 86,86 88,96 Q 94,98 96,90 Z" />
        <path d="M 128,82 Q 134,86 132,96 Q 126,98 124,90 Z" />

        {/* Trunk - curved down to side */}
        <path
          d="M 110,94 Q 108,104 104,108 Q 102,112 106,113 Q 110,112 112,108"
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Body - seated lotus position */}
        <path d="M 92,116 Q 110,108 128,116 L 132,140 Q 110,148 88,140 Z" />

        {/* Crossed legs base */}
        <ellipse cx="110" cy="148" rx="22" ry="6" />

        {/* Two upper arms with lotus / objects */}
        <g
          fill="none"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M 96,118 Q 84,118 82,108" />
          <path d="M 124,118 Q 136,118 138,108" />
          <path d="M 96,124 Q 86,128 86,134" />
          <path d="M 124,124 Q 134,128 134,134" />
        </g>

        {/* Lotus (left hand) */}
        <g fill={fill}>
          <path d="M 80,104 Q 78,100 82,99 Q 86,100 84,104 Z" />
          <path d="M 84,103 Q 84,99 88,100 L 86,105 Z" />
        </g>

        {/* Tilak / center mark on forehead */}
        <circle cx="110" cy="80" r="1.2" fill={stroke} />
      </g>

      {/* Lotus base ornament */}
      <g fill={fill} opacity="0.8">
        <path d="M 92,158 Q 110,150 128,158 L 124,162 Q 110,158 96,162 Z" />
        <circle cx="110" cy="160" r="1.2" />
      </g>

      {/* Star ornaments at left/right of arched text gap */}
      <g fill={fill}>
        <circle cx="29" cy="110" r="2" />
        <circle cx="191" cy="110" r="2" />
      </g>
    </svg>
  );
}
