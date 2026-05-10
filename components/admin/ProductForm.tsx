"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { slugify } from "@/lib/utils";
import type { Category, Product } from "@/lib/supabase/types";

const productSchema = z.object({
  title_en: z.string().min(2),
  title_te: z.string().optional(),
  slug: z.string().min(2),
  sku: z.string().optional(),
  description_en: z.string().optional(),
  description_te: z.string().optional(),
  price_inr: z.coerce.number().min(0),
  discount_price_inr: z.coerce.number().min(0).optional().or(z.literal("")),
  category_id: z.string().min(1),
  stock_status: z.enum(["in_stock", "made_to_order", "sold_out"]),
  is_featured: z.boolean(),
  is_trending: z.boolean(),
  is_new_arrival: z.boolean(),
  has_sale_badge: z.boolean(),
  has_offer_badge: z.boolean(),
  is_active: z.boolean(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof productSchema>;

type Props = {
  product?: Product;
  categories: Category[];
};

export function ProductForm({ product, categories }: Props) {
  const router = useRouter();
  const [imageUrls, setImageUrls] = useState<string[]>(
    product?.images?.map((i) => i.original_url) ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title_en: product?.title_en ?? "",
      title_te: product?.title_te ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      description_en: product?.description_en ?? "",
      description_te: product?.description_te ?? "",
      price_inr: product?.price_inr ?? 0,
      discount_price_inr: product?.discount_price_inr ?? undefined,
      category_id: product?.category_id ?? categories[0]?.id ?? "",
      stock_status: product?.stock_status ?? "in_stock",
      is_featured: product?.is_featured ?? false,
      is_trending: product?.is_trending ?? false,
      is_new_arrival: product?.is_new_arrival ?? true,
      has_sale_badge: product?.has_sale_badge ?? false,
      has_offer_badge: product?.has_offer_badge ?? false,
      is_active: product?.is_active ?? true,
      tags: product?.tags?.join(", ") ?? "",
    },
  });

  const titleEn = watch("title_en");

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        ...values,
        slug: values.slug || slugify(values.title_en),
        tags: values.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [],
        discount_price_inr:
          values.discount_price_inr === "" ? null : Number(values.discount_price_inr),
        images: imageUrls,
      };

      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  });

  const inputClass =
    "w-full bg-ivory border border-ink/15 focus:border-ink py-2.5 px-3 text-ink outline-none transition-colors text-sm";
  const labelClass = "smallcaps text-[0.6rem] text-champagne-deep mb-1.5 inline-block";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Images */}
      <Section title="Photos" description="At least one. Tap the camera to take a new photo.">
        <ImageUploader
          urls={imageUrls}
          onChange={setImageUrls}
          max={6}
        />
      </Section>

      {/* Basics */}
      <Section title="Basics">
        <div className="grid gap-4">
          <div>
            <label className={labelClass}>Title (English)</label>
            <input
              {...register("title_en")}
              className={inputClass}
              onBlur={(e) => {
                if (!watch("slug")) setValue("slug", slugify(e.target.value));
              }}
              placeholder="Kundan Chandbali Earrings"
            />
            {errors.title_en && <FieldError>Required</FieldError>}
          </div>
          <div>
            <label className={labelClass}>Title (Telugu, optional)</label>
            <input
              {...register("title_te")}
              className={inputClass}
              placeholder="కుందన్ చాంద్‌బాలి జుంకాలు"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Slug (URL)</label>
              <input
                {...register("slug")}
                className={inputClass}
                placeholder={titleEn ? slugify(titleEn) : "auto"}
              />
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <input
                {...register("sku")}
                className={inputClass}
                placeholder="VN-J-001"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price (₹)</label>
            <input
              type="number"
              {...register("price_inr")}
              className={inputClass}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Discount price (optional)</label>
            <input
              type="number"
              {...register("discount_price_inr")}
              className={inputClass}
              inputMode="numeric"
              placeholder="—"
            />
          </div>
        </div>
      </Section>

      {/* Category & stock */}
      <Section title="Category & availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select {...register("category_id")} className={inputClass}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Availability</label>
            <select {...register("stock_status")} className={inputClass}>
              <option value="in_stock">In stock</option>
              <option value="made_to_order">Made to order</option>
              <option value="sold_out">Sold out</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass}>Tags (comma separated)</label>
          <input
            {...register("tags")}
            className={inputClass}
            placeholder="earrings, kundan, bridal"
          />
        </div>
      </Section>

      {/* Description */}
      <Section title="Description">
        <div className="grid gap-4">
          <div>
            <label className={labelClass}>English</label>
            <textarea
              {...register("description_en")}
              className={`${inputClass} min-h-[100px] resize-y`}
            />
          </div>
          <div>
            <label className={labelClass}>Telugu (optional)</label>
            <textarea
              {...register("description_te")}
              className={`${inputClass} min-h-[100px] resize-y`}
            />
          </div>
        </div>
      </Section>

      {/* Toggles */}
      <Section title="Show on" description="Where this piece appears across the site.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle {...register("is_active")} label="Active (visible on site)" defaultChecked={watch("is_active")} />
          <Toggle {...register("is_featured")} label="Featured on homepage" defaultChecked={watch("is_featured")} />
          <Toggle {...register("is_trending")} label="Trending" defaultChecked={watch("is_trending")} />
          <Toggle {...register("is_new_arrival")} label="New arrival" defaultChecked={watch("is_new_arrival")} />
          <Toggle {...register("has_sale_badge")} label="Show Sale badge" defaultChecked={watch("has_sale_badge")} />
          <Toggle {...register("has_offer_badge")} label="Show Offer badge" defaultChecked={watch("has_offer_badge")} />
        </div>
      </Section>

      {error && (
        <p className="text-cognac text-sm border-l-2 border-cognac pl-3 py-2 bg-cognac/5">
          {error}
        </p>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-[60px] lg:bottom-0 -mx-4 sm:mx-0 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex gap-3 z-10">
        <Button type="submit" variant="ink" disabled={submitting} fullWidth>
          {submitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      </div>
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-cognac text-xs mt-1">{children}</p>;
}

const Toggle = function Toggle({
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
};
