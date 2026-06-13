"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ikImage } from "@/lib/imagekit";
import { displayUrl } from "@/lib/product-images";
import { shotLabel, shotExperimental } from "@/lib/ai/presets";
import type { AiImageJob, ProductImage } from "@/lib/supabase/types";

type Props = { productId: string };

type StatusResponse = {
  job: AiImageJob | null;
  images: ProductImage[];
  mock: boolean;
};

type EnqueueResponse = {
  jobId: string;
  total: number;
  mock: boolean;
  alreadyComplete?: boolean;
  variants: { index: number; id: string; label: string }[];
  error?: string;
  message?: string;
};

const variantLabel = (id: string | null) => shotLabel(id);

export function AiImagePanel({ productId }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ai/status?productId=${productId}`);
      if (!res.ok) throw new Error("Could not load AI images");
      const data = (await res.json()) as StatusResponse;
      setImages(data.images ?? []);
      setMock(Boolean(data.mock));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load AI images");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(
    async (force: boolean) => {
      setError(null);
      setGenerating(true);
      abortRef.current = false;
      try {
        const enqRes = await fetch("/api/admin/ai/enqueue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, force }),
        });
        const enq = (await enqRes.json()) as EnqueueResponse;
        if (!enqRes.ok) {
          throw new Error(enq.message ?? enq.error ?? "Could not start generation");
        }
        if (enq.alreadyComplete) {
          await refresh();
          return;
        }

        setProgress({ done: 0, total: enq.total });
        let producedAny = false;
        let lastError: string | null = null;
        for (const v of enq.variants) {
          if (abortRef.current) break;
          try {
            const r = await fetch("/api/admin/ai/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: enq.jobId, index: v.index }),
            });
            const d = await r.json().catch(() => ({}));
            if (d.ok) producedAny = true;
            else if (d.error) lastError = d.message ?? d.error;
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
          }
          setProgress({ done: v.index + 1, total: enq.total });
          await refresh();
        }
        if (!producedAny && lastError) {
          setError(`Generation failed: ${lastError}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setGenerating(false);
        setProgress(null);
      }
    },
    [productId, refresh]
  );

  const review = useCallback(
    async (imageId: string, action: "approve" | "reject" | "delete") => {
      setBusyId(imageId);
      setError(null);
      try {
        const res = await fetch("/api/admin/ai/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, action }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message ?? "Action failed");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [refresh]
  );

  const pending = images.filter((i) => i.ai_status === "pending");
  const approved = images.filter((i) => i.ai_status === "approved");
  const rejected = images.filter((i) => i.ai_status === "rejected");
  const hasAny = images.length > 0;

  return (
    <section className="bg-mist-soft/50 border border-ink/10 p-5 lg:p-6">
      <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-[1.2rem] text-ink flex items-center gap-2">
            AI Studio
            {mock && (
              <span className="smallcaps text-[0.5rem] bg-champagne/40 text-ink px-1.5 py-0.5">
                Demo mode
              </span>
            )}
          </h2>
          <p className="text-xs text-ink/60 mt-1">
            Re-shoots your photo into studio, lifestyle &amp; on-model looks with
            OpenAI — white &amp; ivory studio, marble, golden angle, a macro
            detail and a model wearing the piece. The same piece, new scenes.
            Nothing goes live until you approve it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ink"
            onClick={() => generate(true)}
            disabled={generating}
          >
            {generating
              ? progress
                ? `Generating ${progress.done}/${progress.total}…`
                : "Starting…"
              : hasAny
                ? "Generate again"
                : "Generate images"}
          </Button>
          {generating && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                abortRef.current = true;
              }}
            >
              Stop
            </Button>
          )}
        </div>
      </header>

      {mock && (
        <p className="text-xs text-champagne-deep border-l-2 border-champagne pl-3 py-2 bg-champagne/5 mb-4">
          OpenAI isn&apos;t connected yet, so these are placeholder images to
          preview the review flow. Add <code>OPENAI_API_KEY</code> to generate
          real photos.
        </p>
      )}

      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5 mb-4">
          {error}
        </p>
      )}

      {generating && progress && (
        <div className="h-1 bg-ink/10 mb-4 overflow-hidden">
          <div
            className="h-full bg-champagne transition-all duration-300"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink/50">Loading…</p>
      ) : !hasAny && !generating ? (
        <p className="text-sm text-ink/50">
          No AI images yet. Save your photos, then tap{" "}
          <strong className="text-ink">Generate images</strong>.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <ImageGroup
            title="Needs review"
            hint="Approve the good ones to show them on the website."
            list={pending}
            busyId={busyId}
            onReview={review}
            onPreview={setPreview}
            actions={["approve", "reject", "delete"]}
          />
          <ImageGroup
            title="Live on website"
            hint="These appear in the product gallery."
            list={approved}
            busyId={busyId}
            onReview={review}
            onPreview={setPreview}
            actions={["reject"]}
          />
          <ImageGroup
            title="Hidden"
            hint="Rejected — not shown anywhere."
            list={rejected}
            busyId={busyId}
            onReview={review}
            onPreview={setPreview}
            actions={["approve", "delete"]}
          />
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Close preview"
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-ink/60 text-ivory text-2xl leading-none flex items-center justify-center hover:bg-ink"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ikImage(preview, { width: 1400, format: "auto" })}
            alt="AI image preview"
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

function ImageGroup({
  title,
  hint,
  list,
  busyId,
  onReview,
  onPreview,
  actions,
}: {
  title: string;
  hint: string;
  list: ProductImage[];
  busyId: string | null;
  onReview: (id: string, action: "approve" | "reject" | "delete") => void;
  onPreview: (url: string) => void;
  actions: ("approve" | "reject" | "delete")[];
}) {
  if (!list.length) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="smallcaps text-[0.6rem] text-champagne-deep">
          {title} · {list.length}
        </h3>
      </div>
      <p className="text-xs text-ink/50 mb-3">{hint}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((img) => {
          const busy = busyId === img.id;
          const experimental = shotExperimental(img.ai_variant);
          return (
            <figure key={img.id} className="bg-ivory border border-ink/10">
              <div className="relative aspect-square bg-mist">
                <Image
                  src={ikImage(displayUrl(img), { width: 400, format: "auto" })}
                  alt={variantLabel(img.ai_variant)}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {experimental && (
                  <span className="absolute top-1.5 left-1.5 smallcaps text-[0.5rem] px-1.5 py-0.5 bg-ink/70 text-ivory">
                    Experimental
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Preview image"
                  onClick={() => onPreview(displayUrl(img))}
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-ink/50 text-ivory flex items-center justify-center hover:bg-ink/80 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <figcaption className="absolute bottom-0 inset-x-0 bg-ink/70 text-ivory text-[0.55rem] smallcaps px-2 py-1">
                  {variantLabel(img.ai_variant)}
                </figcaption>
              </div>
              <div className="flex border-t border-ink/10">
                {actions.includes("approve") && (
                  <ActionButton disabled={busy} onClick={() => onReview(img.id, "approve")}>
                    ✓ Approve
                  </ActionButton>
                )}
                {actions.includes("reject") && (
                  <ActionButton disabled={busy} onClick={() => onReview(img.id, "reject")}>
                    Hide
                  </ActionButton>
                )}
                {actions.includes("delete") && (
                  <ActionButton
                    disabled={busy}
                    danger
                    onClick={() => onReview(img.id, "delete")}
                  >
                    Delete
                  </ActionButton>
                )}
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex-1 text-[0.6rem] smallcaps py-2 transition-colors disabled:opacity-40",
        danger
          ? "text-cognac hover:bg-cognac/10"
          : "text-ink hover:bg-ink hover:text-ivory",
        "border-r border-ink/10 last:border-r-0",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
