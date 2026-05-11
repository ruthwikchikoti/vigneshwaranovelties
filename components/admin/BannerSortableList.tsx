"use client";

import Link from "next/link";
import Image from "next/image";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { SortableList } from "./SortableList";
import type { Banner } from "@/lib/supabase/types";

type Props = { banners: Banner[] };

export function BannerSortableList({ banners }: Props) {
  return (
    <SortableList
      table="banners"
      initial={banners}
      renderItem={(b) => {
        const url = b.desktop_image_url ?? b.mobile_image_url ?? placeholderImage(b.title, 800, 400);
        const inRotation = b.is_active;
        return (
          <Link
            href={`/admin/banners/${b.id}`}
            className="flex gap-4 items-center p-3 hover:bg-mist-soft transition-colors"
          >
            <div className="relative w-32 h-16 flex-shrink-0 overflow-hidden bg-mist">
              <Image src={ikImage(url, { width: 400 })} alt="" fill sizes="128px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-ink truncate">{b.title}</p>
                {inRotation && (
                  <span className="smallcaps text-[0.5rem] tracking-[0.16em] bg-champagne text-ink px-1.5 py-0.5">
                    In rotation
                  </span>
                )}
              </div>
              {b.link_url && (
                <p className="text-xs text-ink/50 mt-0.5 truncate">→ {b.link_url}</p>
              )}
            </div>
            <span className={b.is_active ? "smallcaps text-[0.55rem] text-champagne-deep" : "smallcaps text-[0.55rem] text-ink/30"}>
              {b.is_active ? "Visible" : "Hidden"}
            </span>
          </Link>
        );
      }}
    />
  );
}
