import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/* The circular brand seal — Ganesha enclosed by the Vigneshwara/Novelties wreath.
   Transparent PNG so it sits cleanly on cream canvas or navy ink-panel. */
export function Seal({ size = 52, className, priority }: Props) {
  return (
    <Image
      src="/brand/seal.png"
      alt="Vigneshwara Novelties"
      width={size}
      height={size}
      priority={priority}
      className={cn("block select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}
