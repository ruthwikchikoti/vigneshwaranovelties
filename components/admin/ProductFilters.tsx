"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/types";

type Props = {
  categories: Category[];
  /** Counts shown next to each filter chip; computed server-side for accuracy. */
  counts: { total: number; active: number; inactive: number };
};

export function ProductFilters({ categories, counts }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const category = sp.get("category") ?? "";
  const active = sp.get("active") ?? "";

  // Push URL changes through React transitions so the page re-renders without
  // a full reload and the input keeps focus while data refetches.
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.replace(`?${next.toString()}`);
    });
  };

  // Debounced search — wait 300ms after typing stops before pushing.
  useEffect(() => {
    const current = sp.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const chipClass = (selected: boolean) =>
    cn(
      "smallcaps text-[0.6rem] px-3 py-1.5 border whitespace-nowrap transition-colors",
      selected
        ? "bg-ink text-ivory border-ink"
        : "bg-ivory text-ink border-ink/15 hover:border-ink"
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or item code…"
          className="w-full bg-ivory border border-ink/15 focus:border-ink py-2.5 pl-10 pr-3 text-ink text-sm outline-none transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        {pending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="inline-block w-3 h-3 border border-ink/40 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setParam("active", null)}
          className={chipClass(active === "")}
        >
          All · {counts.total}
        </button>
        <button
          type="button"
          onClick={() => setParam("active", "true")}
          className={chipClass(active === "true")}
        >
          Active · {counts.active}
        </button>
        <button
          type="button"
          onClick={() => setParam("active", "false")}
          className={chipClass(active === "false")}
        >
          Inactive · {counts.inactive}
        </button>

        <span className="w-px h-5 bg-ink/15 mx-1 flex-shrink-0" />

        <select
          value={category}
          onChange={(e) => setParam("category", e.target.value || null)}
          className="bg-ivory border border-ink/15 hover:border-ink py-1.5 px-3 text-[0.7rem] smallcaps text-ink outline-none transition-colors"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>

        {(q || category || active) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace("?"));
            }}
            className="smallcaps text-[0.55rem] text-ink/55 hover:text-vermilion ml-2 whitespace-nowrap"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
