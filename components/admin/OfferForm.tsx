"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { BilingualField } from "./BilingualField";
import { ConfirmDialog } from "./ConfirmDialog";
import { offerPayloadSchema, type OfferPayload } from "@/lib/validations/category";
import type { Offer, Category } from "@/lib/supabase/types";

type Props = { offer?: Offer; categories?: Category[] };

export function OfferForm({ offer, categories = [] }: Props) {
  const router = useRouter();
  const [bannerUrl, setBannerUrl] = useState<string | null>(offer?.banner_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm<OfferPayload>({
    resolver: zodResolver(offerPayloadSchema),
    defaultValues: {
      title_en: offer?.title_en ?? "",
      title_te: offer?.title_te ?? "",
      description_en: offer?.description_en ?? "",
      description_te: offer?.description_te ?? "",
      discount_pct: offer?.discount_pct ?? undefined,
      starts_at: offer?.starts_at?.slice(0, 10) ?? "",
      ends_at: offer?.ends_at?.slice(0, 10) ?? "",
      is_active: offer?.is_active ?? true,
      category_id: offer?.category_id ?? "",
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      setSubmitting(true);
      try {
        const body = { ...values, banner_url: bannerUrl };
        const res = await fetch(
          offer ? `/api/admin/offers/${offer.id}` : "/api/admin/offers",
          {
            method: offer ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? data.error ?? "Could not save");
        }
        router.push("/admin/offers");
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
    if (!offer) return;
    setConfirmingDelete(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      router.push("/admin/offers");
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
      <Section title="Title" description="Type in either language — the other side fills in automatically.">
        <BilingualField
          label="Title"
          enValue={watch("title_en") ?? ""}
          teValue={watch("title_te") ?? ""}
          onChangeEn={(v) => setValue("title_en", v, { shouldDirty: true })}
          onChangeTe={(v) => setValue("title_te", v, { shouldDirty: true })}
          placeholderEn="Wedding Season Special"
          placeholderTe="వివాహ సీజన్ స్పెషల్"
        />
      </Section>

      <Section title="Description" description="Same here — write in either language.">
        <BilingualField
          label="Description"
          type="textarea"
          textareaRows={3}
          enValue={watch("description_en") ?? ""}
          teValue={watch("description_te") ?? ""}
          onChangeEn={(v) => setValue("description_en", v, { shouldDirty: true })}
          onChangeTe={(v) => setValue("description_te", v, { shouldDirty: true })}
        />
      </Section>

      <Section
        title="Apply this discount to a collection"
        description="Pick a category — every product in it gets the discount automatically while the offer is active. Customers also land on this category when they tap the offer card."
      >
        <select {...register("category_id")} className={inputClass}>
          <option value="">(No category — marketing card only, no automatic discount)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Discount & dates" description="The percentage off, and the window when this offer is live.">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Discount %</label>
            <input
              type="number"
              {...register("discount_pct")}
              className={inputClass}
              inputMode="numeric"
              placeholder="15"
              min={0}
              max={99}
            />
          </div>
          <div>
            <label className={label}>Starts</label>
            <input type="date" {...register("starts_at")} className={inputClass} />
          </div>
          <div>
            <label className={label}>Ends</label>
            <input type="date" {...register("ends_at")} className={inputClass} />
          </div>
        </div>
      </Section>

      <Section title="Banner image" description="Wide image shown on the homepage offer band.">
        <ImageUploader urls={bannerUrl ? [bannerUrl] : []} onChange={(u) => setBannerUrl(u[0] ?? null)} max={1} />
      </Section>

      <Section title="Visibility">
        <Toggle {...register("is_active")} label="Active (shown on site)" defaultChecked={watch("is_active")} />
      </Section>

      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">{error}</p>
      )}

      <div className="sticky bottom-[60px] lg:bottom-0 -mx-4 sm:mx-0 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex gap-3 z-10">
        <Button type="submit" variant="ink" disabled={submitting} fullWidth>
          {submitting ? "Saving…" : offer ? "Save changes" : "Create offer"}
        </Button>
        {offer && (
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

      {offer && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this offer?"
          description={`"${offer.title_en}" will be removed. Any category-wide discount it was applying will stop immediately.`}
          confirmLabel="Delete offer"
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
