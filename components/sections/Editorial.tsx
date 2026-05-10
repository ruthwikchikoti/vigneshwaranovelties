import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ikImage } from "@/lib/imagekit";
import { ButtonLink } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/Icons";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  reverse?: boolean;
};

export function Editorial({
  eyebrow,
  title,
  body,
  imageUrl,
  ctaLabel,
  ctaHref,
  reverse,
}: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <div className="relative aspect-[4/5] overflow-hidden bg-mist">
          <Image
            src={ikImage(imageUrl, { width: 1200, format: "auto", quality: 88 })}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className={reverse ? "lg:order-1 lg:pl-8" : "lg:pr-8"}>
        <p className="smallcaps text-[0.65rem] text-champagne-deep mb-5">
          {eyebrow}
        </p>
        <h2 className="font-display text-[2.5rem] sm:text-[3rem] lg:text-[3.75rem] leading-[0.95] text-ink mb-6">
          {title}
        </h2>
        <div className="divider-gold w-24 mb-6" />
        <p className="text-ink/70 text-[1.05rem] leading-relaxed max-w-md mb-8">
          {body}
        </p>
        <ButtonLink href={ctaHref} variant="ghost">
          {ctaLabel}
          <IconArrowRight />
        </ButtonLink>
      </div>
    </div>
  );
}
