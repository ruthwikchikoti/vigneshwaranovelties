"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import type { ProductImage } from "@/lib/supabase/types";
import { displayUrl, publicGalleryImages } from "@/lib/product-images";
import { cn } from "@/lib/utils";

type Props = {
  images: ProductImage[];
  alt: string;
};

export function ProductGallery({ images, alt }: Props) {
  const t = useTranslations("product");
  const [active, setActive] = useState(0);
  const fallback: ProductImage = {
    id: "ph",
    product_id: "",
    original_url: placeholderImage(alt, 1200, 1500),
    optimized_url: null,
    ai_generated_url: null,
    alt_text: null,
    sort_order: 0,
    is_primary: true,
    ai_status: "none",
    ai_variant: null,
    ai_prompt: null,
    ai_model: null,
    ai_job_id: null,
  };
  // Owner originals + approved AI variants only; pending/rejected are hidden.
  const visible = publicGalleryImages(images);
  const list = visible.length ? visible : [fallback];
  const current = list[active] ?? list[0];

  return (
    <div className="grid lg:grid-cols-[1fr_4.5fr] gap-3 lg:gap-5">
      {/* Thumbs (vertical on desktop, horizontal on mobile) */}
      <div className="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-x-auto scrollbar-hidden">
        {list.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "relative flex-shrink-0 w-16 lg:w-full aspect-square overflow-hidden bg-mist transition-all",
              active === i ? "ring-1 ring-ink opacity-100" : "opacity-50 hover:opacity-100"
            )}
            aria-label={t("viewImage", { number: i + 1 })}
          >
            <Image
              src={ikImage(displayUrl(img), { width: 200, format: "auto" })}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <div className="order-1 lg:order-2 relative aspect-[4/5] overflow-hidden bg-mist">
        <Image
          src={ikImage(displayUrl(current), { width: 1400, format: "auto", quality: 90 })}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
