"use client";

import Link from "next/link";
import Image from "next/image";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { SortableList } from "./SortableList";
import type { Category } from "@/lib/supabase/types";

type Props = { categories: Category[] };

export function CategorySortableList({ categories }: Props) {
  return (
    <SortableList
      table="categories"
      initial={categories}
      renderItem={(c) => {
        const url = c.image_url ?? placeholderImage(c.name_en, 400, 400);
        return (
          <Link
            href={`/admin/categories/${c.id}`}
            className="flex gap-4 p-4 items-center hover:bg-mist-soft transition-colors"
          >
            <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden bg-mist">
              <Image src={ikImage(url, { width: 200 })} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink truncate">{c.name_en}</p>
              <p className="text-xs text-ink/50 tabular truncate">/{c.slug}</p>
              <p
                className={
                  c.is_active
                    ? "smallcaps text-[0.55rem] text-champagne-deep mt-1"
                    : "smallcaps text-[0.55rem] text-ink/30 mt-1"
                }
              >
                {c.is_active ? "Visible" : "Hidden"}
              </p>
            </div>
          </Link>
        );
      }}
    />
  );
}
