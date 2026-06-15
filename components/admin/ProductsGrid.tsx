"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ikImage, placeholderImage } from "@/lib/imagekit";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Product } from "@/lib/supabase/types";

/**
 * Admin product grid with inline delete. Deletion is optimistic — the card
 * disappears the moment the API confirms, and the list re-syncs in the
 * background — so it feels instant instead of a full-page refetch.
 */
export function ProductsGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = products.filter((p) => !deletedIds.has(p.id));

  function confirmDelete() {
    const target = pending;
    if (!target) return;
    // Optimistic: remove the card + close the dialog immediately, then delete in
    // the background. Roll back if the server rejects it.
    setDeletedIds((prev) => new Set(prev).add(target.id));
    setPending(null);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/products/${target.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? data.error ?? "Could not delete");
        }
        router.refresh(); // sync header counts in the background
      } catch (e) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
        setError(`Couldn't delete "${target.title_en}": ${e instanceof Error ? e.message : "error"}`);
      }
    })();
  }

  return (
    <>
      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">{error}</p>
      )}
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((p) => {
          const primary = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
          const url = primary?.original_url ?? placeholderImage(p.title_en);
          const price = p.discount_price_inr ?? p.price_inr;
          return (
            <li key={p.id} className="relative bg-ivory border border-ink/10">
              <button
                type="button"
                onClick={() => setPending(p)}
                aria-label={`Delete ${p.title_en}`}
                className="absolute top-2 right-2 z-10 h-8 w-8 grid place-items-center rounded-full bg-ivory/90 border border-ink/10 text-cognac hover:bg-cognac hover:text-ivory transition-colors shadow-sm"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
              <Link href={`/admin/products/${p.id}`} className="block">
                <div className="relative aspect-[4/5] bg-mist overflow-hidden">
                  <Image
                    src={ikImage(url, { width: 600 })}
                    alt={p.title_en}
                    fill
                    sizes="(min-width: 1024px) 30vw, 50vw"
                    className="object-cover"
                  />
                  {!p.is_active && (
                    <div className="absolute inset-0 bg-ivory/70 grid place-items-center">
                      <span className="smallcaps text-[0.6rem] text-ink">Inactive</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <h3 className="font-medium text-ink line-clamp-2">{p.title_en}</h3>
                  <p className="tabular text-sm text-ink/70">{formatINR(price)}</p>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    {p.is_featured && <Tag>Featured</Tag>}
                    {p.is_trending && <Tag>Trending</Tag>}
                    {p.is_new_arrival && <Tag>New</Tag>}
                    {p.has_sale_badge && <Tag tone="sale">Sale</Tag>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        title="Delete this product?"
        description={pending ? `"${pending.title_en}" will be permanently removed from the site. This can't be undone.` : ""}
        confirmLabel="Delete product"
        variant="danger"
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "sale" }) {
  return (
    <span
      className={cn(
        "smallcaps text-[0.5rem] px-1.5 py-0.5",
        tone === "sale" ? "bg-cognac/10 text-cognac" : "bg-ink/5 text-ink/70"
      )}
    >
      {children}
    </span>
  );
}
