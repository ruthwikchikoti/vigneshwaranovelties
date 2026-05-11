"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { ConfirmDialog } from "./ConfirmDialog";
import { bannerPayloadSchema, type BannerPayload } from "@/lib/validations/category";
import type { Banner, Category } from "@/lib/supabase/types";

type Props = { banner?: Banner; categories?: Category[] };

export function BannerForm({ banner, categories = [] }: Props) {
  const router = useRouter();
  const [desktopUrl, setDesktopUrl] = useState<string | null>(banner?.desktop_image_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { register, handleSubmit, watch } = useForm<BannerPayload>({
    resolver: zodResolver(bannerPayloadSchema),
    defaultValues: {
      title: banner?.title ?? "",
      link_url: banner?.link_url ?? "",
      position: (banner?.position as "hero" | "promo" | "seasonal") ?? "hero",
      sort_order: banner?.sort_order ?? 0,
      is_active: banner?.is_active ?? true,
      badge_text: banner?.badge_text ?? "",
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      setSubmitting(true);
      try {
        // One source image — ImageKit serves it at different sizes for desktop vs mobile,
        // so we don't store a separate mobile asset.
        const body = { ...values, desktop_image_url: desktopUrl, mobile_image_url: null };
        const res = await fetch(
          banner ? `/api/admin/banners/${banner.id}` : "/api/admin/banners",
          {
            method: banner ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? data.error ?? "Could not save");
        }
        router.push("/admin/banners");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      } finally {
        setSubmitting(false);
      }
    },
    (errors) => {
      const first = Object.values(errors)[0];
      const msg =
        first && typeof first === "object" && "message" in first
          ? (first as { message?: string }).message
          : null;
      setError(msg || "Please fill in the highlighted fields.");
    }
  );

  const onDelete = async () => {
    if (!banner) return;
    setConfirmingDelete(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      router.push("/admin/banners");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-ivory border border-ink/15 focus:border-ink py-2.5 px-3 text-ink outline-none transition-colors text-sm";
  const label = "smallcaps text-[0.6rem] text-champagne-deep mb-1.5 inline-block";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Section title="Basics">
        <div className="grid gap-4">
          <div>
            <label className={label}>Title (for your reference only)</label>
            <input {...register("title")} className={inputClass} placeholder="e.g. Diwali bridal hero" />
            <p className="text-[0.7rem] text-ink/50 mt-1.5">
              Only you see this — it&apos;s a name to help you find the banner later.
            </p>
          </div>
          <div>
            <label className={label}>When tapped, take customer to…</label>
            <select {...register("link_url")} className={inputClass}>
              <option value="">(No link — just a picture)</option>
              {categories.map((c) => (
                <option key={c.id} value={`/category/${c.slug}`}>
                  {c.name_en}
                </option>
              ))}
            </select>
            <p className="text-[0.7rem] text-ink/50 mt-1.5">
              Pick a collection to send customers to when they tap the banner. Leave as &ldquo;No link&rdquo; for a picture-only banner.
            </p>
          </div>
          <div>
            <label className={label}>Badge text (optional)</label>
            <input
              {...register("badge_text")}
              className={inputClass}
              maxLength={40}
              placeholder="e.g. DIWALI EDIT, NEW SEASON, 20% OFF"
            />
            <p className="text-[0.7rem] text-ink/50 mt-1.5">
              Small label that overlays the corner of the banner image. Keep it short and in ALL CAPS — under 40 characters.
            </p>
          </div>
          {/* Position + sort_order are managed automatically — banners just rotate on the homepage. */}
          <input type="hidden" {...register("position")} />
          <input type="hidden" {...register("sort_order", { valueAsNumber: true })} />
        </div>
      </Section>

      <Section
        title="Banner image"
        description="One image is enough — we resize it for desktop and mobile automatically. Aim for a wide, high-quality photo (around 2400 × 1200 or larger)."
      >
        <ImageUploader urls={desktopUrl ? [desktopUrl] : []} onChange={(u) => setDesktopUrl(u[0] ?? null)} max={1} />
      </Section>

      <Section title="Visibility">
        <Toggle {...register("is_active")} label="Active (shown on site)" defaultChecked={watch("is_active")} />
      </Section>

      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">{error}</p>
      )}

      <div className="sticky bottom-[60px] lg:bottom-0 -mx-4 sm:mx-0 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex gap-3 z-10">
        <Button type="submit" variant="ink" disabled={submitting} fullWidth>
          {submitting ? "Saving…" : banner ? "Save changes" : "Create banner"}
        </Button>
        {banner && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            disabled={submitting}
            className="!border-vermilion !text-vermilion"
          >
            Delete
          </Button>
        )}
      </div>

      {banner && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this banner?"
          description={`"${banner.title}" will be removed from the homepage rotation.`}
          confirmLabel="Delete banner"
          variant="danger"
          busy={submitting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-mist-soft/50 border border-ink/10 p-5 lg:p-6">
      <header className="mb-4">
        <h2 className="font-display text-[1.2rem] text-ink">{title}</h2>
        {description && <p className="text-xs text-ink/60 mt-1">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Toggle({
  label,
  defaultChecked,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-ivory border border-ink/10 cursor-pointer hover:border-ink/30 transition-colors">
      <span className="text-sm text-ink">{label}</span>
      <span className="relative inline-block w-10 h-6 flex-shrink-0">
        <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} {...props} />
        <span className="absolute inset-0 bg-ink/15 peer-checked:bg-champagne transition-colors rounded-full" />
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-ivory rounded-full transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
