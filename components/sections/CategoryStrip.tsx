import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { Category } from "@/lib/supabase/types";
import { localize } from "@/lib/supabase/types";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { useLocale } from "next-intl";
import { IconArrowRight } from "@/components/ui/Icons";

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const locale = useLocale() as "en" | "te";

  return (
    <div className="overflow-x-auto scrollbar-hidden -mx-5 sm:-mx-8 lg:mx-0">
      <div className="flex gap-4 sm:gap-6 lg:gap-8 px-5 sm:px-8 lg:px-0 lg:grid lg:grid-cols-3 lg:auto-rows-fr">
        {categories.map((cat, i) => {
          const name = localize(cat, locale, "name");
          const description = localize(cat, locale, "description");
          const url = cat.image_url ?? placeholderImage(name);
          return (
            <Link
              href={`/category/${cat.slug}`}
              key={cat.id}
              className="group relative flex-shrink-0 w-[78vw] sm:w-[55vw] lg:w-auto aspect-[3/4] overflow-hidden bg-mist-soft"
            >
              <Image
                src={ikImage(url, { width: 900, format: "auto", quality: 88 })}
                alt={name}
                fill
                sizes="(min-width: 1024px) 33vw, 70vw"
                className="object-cover product-card-image"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 text-ivory">
                <p className="smallcaps text-[0.6rem] text-champagne mb-2">
                  Collection
                </p>
                <h3 className="font-display text-[1.75rem] sm:text-[2.25rem] leading-tight">
                  {name}
                </h3>
                {description ? (
                  <p className="text-ivory/70 text-[0.85rem] mt-2 line-clamp-2 max-w-xs">
                    {description}
                  </p>
                ) : null}
                <span className="inline-flex items-center gap-2 smallcaps text-[0.65rem] mt-4 text-champagne group-hover:gap-3 transition-all">
                  Explore
                  <IconArrowRight />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
