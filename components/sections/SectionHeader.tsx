import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@/components/ui/Icons";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  align?: "left" | "center" | "between";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  hrefLabel = "View all",
  align = "between",
  className,
}: Props) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "text-center items-center"
      )}
    >
      {eyebrow ? (
        <p className="smallcaps text-[0.65rem] text-champagne-deep">{eyebrow}</p>
      ) : null}
      <h2 className="font-display text-[2.25rem] sm:text-[2.75rem] lg:text-[3.5rem] text-ink">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-ink/60 max-w-xl text-[0.95rem] leading-relaxed mt-1">
          {subtitle}
        </p>
      ) : null}
    </div>
  );

  if (align === "between") {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-end justify-between gap-6",
          className
        )}
      >
        {content}
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-2 smallcaps text-[0.7rem] text-ink hover:text-champagne-deep transition-colors self-start sm:self-end pb-3 group"
          >
            {hrefLabel}
            <IconArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
