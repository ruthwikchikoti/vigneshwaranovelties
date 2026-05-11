"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { BilingualField } from "./BilingualField";
import { ConfirmDialog } from "./ConfirmDialog";
import { slugify } from "@/lib/utils";
import { categoryPayloadSchema, type CategoryPayload } from "@/lib/validations/category";
import type { Category } from "@/lib/supabase/types";

type Props = { category?: Category };

export function CategoryForm({ category }: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(category?.banner_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<CategoryPayload>({
    resolver: zodResolver(categoryPayloadSchema),
    defaultValues: {
      slug: category?.slug ?? "",
      name_en: category?.name_en ?? "",
      name_te: category?.name_te ?? "",
      description_en: category?.description_en ?? "",
      description_te: category?.description_te ?? "",
      sort_order: category?.sort_order ?? 0,
      is_active: category?.is_active ?? true,
    },
  });

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      setSubmitting(true);
      try {
        const body = {
          ...values,
          slug: values.slug || slugify(values.name_en),
          image_url: imageUrl,
          banner_url: bannerUrl,
        };
        const res = await fetch(
          category ? `/api/admin/categories/${category.id}` : "/api/admin/categories",
          {
            method: category ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? data.error ?? "Could not save");
        }
        router.push("/admin/categories");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      } finally {
        setSubmitting(false);
      }
    },
    (errors) => {
      // Surface validation problems instead of failing silently.
      const first = Object.values(errors)[0];
      const msg = first && typeof first === "object" && "message" in first ? (first as { message?: string }).message : null;
      setError(msg || "Please fill in the highlighted fields.");
    }
  );

  const onDelete = async () => {
    if (!category) return;
    setConfirmingDelete(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      router.push("/admin/categories");
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
      <Section title="Basics" description="Type in either language — the other side fills in automatically.">
        <div className="grid gap-5">
          <BilingualField
            label="Name"
            enValue={watch("name_en") ?? ""}
            teValue={watch("name_te") ?? ""}
            onChangeEn={(v) => setValue("name_en", v, { shouldDirty: true })}
            onChangeTe={(v) => setValue("name_te", v, { shouldDirty: true })}
            onBlurEn={(v) => { if (!watch("slug")) setValue("slug", slugify(v)); }}
            placeholderEn="1 Gram Gold"
            placeholderTe="1 గ్రాము బంగారం"
          />
          {/* Slug is auto-generated from the English name on save. */}
          <input type="hidden" {...register("slug")} />
          {/* sort_order is managed by drag-to-reorder on the categories list. */}
          <input type="hidden" {...register("sort_order", { valueAsNumber: true })} />
        </div>
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

      <Section title="Card image" description="Square photo shown on the homepage category strip.">
        <ImageUploader
          urls={imageUrl ? [imageUrl] : []}
          onChange={(urls) => setImageUrl(urls[0] ?? null)}
          max={1}
        />
      </Section>

      <Section title="Banner image" description="Wide photo shown at the top of the category page.">
        <ImageUploader
          urls={bannerUrl ? [bannerUrl] : []}
          onChange={(urls) => setBannerUrl(urls[0] ?? null)}
          max={1}
        />
      </Section>

      <Section title="Visibility">
        <Toggle {...register("is_active")} label="Active (visible on site)" defaultChecked={watch("is_active")} />
      </Section>

      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">
          {error}
        </p>
      )}

      <div className="sticky bottom-[60px] lg:bottom-0 -mx-4 sm:mx-0 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex gap-3 z-10">
        <Button type="submit" variant="ink" disabled={submitting} fullWidth>
          {submitting ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
        {category && (
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

      {category && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this category?"
          description={`"${category.name_en}" will be removed from the site. Products in this category will stay, but they won't be grouped under it anymore.`}
          confirmLabel="Delete category"
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
