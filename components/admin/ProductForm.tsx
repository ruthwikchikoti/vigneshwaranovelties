"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";
import { BilingualField } from "./BilingualField";
import { ConfirmDialog } from "./ConfirmDialog";
import { slugify } from "@/lib/utils";
import { ikImage } from "@/lib/imagekit";
import { publicGalleryImages, displayUrl } from "@/lib/product-images";
import type { Category, Product } from "@/lib/supabase/types";

const productSchema = z.object({
  title_en: z.string().min(2, "Please enter a name (English)"),
  title_te: z.string().optional(),
  slug: z.string().optional().default(""),
  sku: z.string().optional(),
  description_en: z.string().optional(),
  description_te: z.string().optional(),
  price_inr: z.coerce.number().min(0, "Price must be 0 or more"),
  discount_price_inr: z.coerce.number().min(0).optional().or(z.literal("")),
  category_id: z.string().min(1, "Pick a category"),
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
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive initial discount % from existing product (if any).
  const initialDiscountPct =
    product?.discount_price_inr && product.price_inr
      ? Math.round(((product.price_inr - product.discount_price_inr) / product.price_inr) * 100)
      : 0;
  const [discountPct, setDiscountPct] = useState<number>(initialDiscountPct);

  // Two-step category picker (main → sub). The catalog has ~40 categories, so a
  // single flat dropdown is unusable — pick the main category, then the sub.
  const parentCats = categories.filter((c) => !c.parent_id);
  const childrenOf = (pid: string) => categories.filter((c) => c.parent_id === pid);
  const currentCat = categories.find((c) => c.id === product?.category_id) ?? null;
  const initialParentId = currentCat ? currentCat.parent_id ?? currentCat.id : parentCats[0]?.id ?? "";
  const initialSubs = childrenOf(initialParentId);
  // When the main has sub-categories, one is required — default to the product's
  // sub (editing) or the first sub (new). Mains with no subs file under the main.
  const initialChildId = currentCat?.parent_id ? currentCat.id : initialSubs[0]?.id ?? "";
  const initialCategoryId = initialChildId || initialParentId;
  const [parentCatId, setParentCatId] = useState(initialParentId);
  const [childCatId, setChildCatId] = useState(initialChildId);
  const subCats = childrenOf(parentCatId);

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
      category_id: initialCategoryId,
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

  // Watched values for bilingual auto-translate.
  const titleEn = watch("title_en");
  const titleTe = watch("title_te") ?? "";
  const descEn = watch("description_en") ?? "";
  const descTe = watch("description_te") ?? "";

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      setSubmitting(true);
      try {
        // Compute the discounted (sale) price from the original price + chosen %.
        const price = Number(values.price_inr) || 0;
        const pct = Math.max(0, Math.min(99, Math.floor(discountPct || 0)));
        const salePrice = pct > 0 && price > 0 ? Math.round(price * (1 - pct / 100)) : null;

        const body = {
          ...values,
          slug: values.slug || slugify(values.title_en),
          tags: values.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [],
          discount_price_inr: salePrice,
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
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message ?? data.error ?? "Could not save");
        }

        // After creating, land on the edit page so the AI Studio is right there.
        if (!product && data.id) {
          router.push(`/admin/products/${data.id}`);
        } else {
          router.push("/admin/products");
        }
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
    if (!product) return;
    setConfirmingDelete(false);
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? data.error ?? "Could not delete");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
      setDeleting(false);
    }
  };

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

      {/* What customers actually see — your photos + approved AI images. */}
      {product && <LiveGalleryPreview product={product} />}

      {/* Basics */}
      <Section title="Basics" description="Type in English or Telugu — the other side fills in automatically. Edit if needed.">
        <div className="grid gap-5">
          <BilingualField
            label="Title"
            enValue={titleEn}
            teValue={titleTe}
            onChangeEn={(v) => setValue("title_en", v, { shouldDirty: true, shouldValidate: true })}
            onChangeTe={(v) => setValue("title_te", v, { shouldDirty: true })}
            onBlurEn={(v) => { if (!watch("slug")) setValue("slug", slugify(v)); }}
            placeholderEn="Kundan Chandbali Earrings"
            placeholderTe="కుందన్ చాంద్‌బాలి జుంకాలు"
            required
          />
          {errors.title_en && <FieldError>Title (English) is required</FieldError>}
          {/* Slug is auto-generated from the English title on save. */}
          <input type="hidden" {...register("slug")} />
          <div>
            <label className={labelClass}>Item code (optional)</label>
            <input
              {...register("sku")}
              className={inputClass}
              placeholder="e.g. VN-001"
            />
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section
        title="Pricing"
        description="Enter the original price. To put it on sale, enter a discount % — we'll calculate the sale price for you."
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Original price (₹)</label>
            <input
              type="number"
              {...register("price_inr")}
              className={inputClass}
              inputMode="numeric"
              placeholder="e.g. 1000"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Discount % — optional</label>
            <input
              type="number"
              value={discountPct || ""}
              onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
              className={inputClass}
              inputMode="numeric"
              placeholder="e.g. 12"
              min={0}
              max={99}
            />
            <PriceHint
              price={Number(watch("price_inr")) || 0}
              pct={discountPct}
            />
          </div>
        </div>
      </Section>

      {/* Category & stock */}
      <Section title="Category & availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            {/* Step 1: main category */}
            <select
              value={parentCatId}
              onChange={(e) => {
                const v = e.target.value;
                setParentCatId(v);
                const first = childrenOf(v)[0]?.id ?? "";
                setChildCatId(first);
                setValue("category_id", first || v, { shouldValidate: true, shouldDirty: true });
              }}
              className={inputClass}
              aria-label="Main category"
            >
              {parentCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
            </select>
            {/* Step 2: sub-category — required when the main has any. */}
            {subCats.length > 0 && (
              <select
                value={childCatId}
                onChange={(e) => {
                  const v = e.target.value;
                  setChildCatId(v);
                  setValue("category_id", v, { shouldValidate: true, shouldDirty: true });
                }}
                className={`${inputClass} mt-2`}
                aria-label="Sub-category"
              >
                {subCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en}
                  </option>
                ))}
              </select>
            )}
            <input type="hidden" {...register("category_id")} />
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
      <Section title="Description" description="Same here — write in either language and we'll fill the other.">
        <BilingualField
          label="Description"
          type="textarea"
          enValue={descEn}
          teValue={descTe}
          onChangeEn={(v) => setValue("description_en", v, { shouldDirty: true })}
          onChangeTe={(v) => setValue("description_te", v, { shouldDirty: true })}
          placeholderEn="A handcrafted pair, finished in our Hyderabad atelier…"
          placeholderTe="హైదరాబాద్ ఆటెలియర్‌లో రూపొందించిన చేతిపని జత…"
        />
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
        <Button type="submit" variant="ink" disabled={submitting || deleting} fullWidth>
          {submitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        {product && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={submitting || deleting}
            className="flex-shrink-0 px-4 border border-cognac/40 text-cognac text-sm smallcaps hover:bg-cognac hover:text-ivory transition-colors disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      {product && (
        <ConfirmDialog
          open={confirmingDelete}
          title="Delete this product?"
          description={`"${product.title_en}" will be permanently removed from the site. This can't be undone.`}
          confirmLabel="Delete product"
          variant="danger"
          busy={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      )}
    </form>
  );
}

/**
 * Read-only strip of everything that appears in the storefront gallery for this
 * product: the owner's original photos plus AI images they approved in the AI
 * Studio, in display order. Mirrors publicGalleryImages() so it matches the live
 * site exactly. Purely a preview — managing originals stays in Photos, AI images
 * stay in the AI Studio below.
 */
function LiveGalleryPreview({ product }: { product: Product }) {
  const live = publicGalleryImages(product.images);
  const aiCount = live.filter((i) => i.ai_status === "approved").length;
  if (live.length <= 1 || aiCount === 0) return null;

  return (
    <Section
      title="On the website"
      description={`What customers see in the gallery — your photos plus ${aiCount} approved AI image${aiCount > 1 ? "s" : ""}, in order. Manage photos above and AI images in the AI Studio below.`}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
        {live.map((img, i) => (
          <div
            key={img.id}
            className="relative flex-shrink-0 w-24 aspect-square bg-mist border border-ink/10"
          >
            <Image
              src={ikImage(displayUrl(img), { width: 200, format: "auto" })}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
            {i === 0 && (
              <span className="absolute bottom-0 inset-x-0 bg-ink/70 text-ivory text-[0.5rem] smallcaps text-center py-0.5">
                Cover
              </span>
            )}
            {img.ai_status === "approved" && (
              <span className="absolute top-1 right-1 bg-champagne/90 text-ink text-[0.5rem] smallcaps px-1 py-0.5">
                AI
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
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

function PriceHint({ price, pct }: { price: number; pct: number }) {
  if (!pct || pct <= 0) {
    return <p className="text-xs text-ink/40 mt-1.5">Leave blank if there's no sale.</p>;
  }
  if (pct >= 100) {
    return (
      <p className="text-xs text-cognac mt-1.5">
        Discount must be less than 100%.
      </p>
    );
  }
  if (!price) {
    return <p className="text-xs text-ink/40 mt-1.5">Enter the original price first.</p>;
  }
  const salePrice = Math.round(price * (1 - pct / 100));
  const saved = price - salePrice;
  return (
    <p className="text-xs text-champagne-deep mt-1.5">
      Sale price: <strong>₹{salePrice.toLocaleString("en-IN")}</strong> · saves ₹
      {saved.toLocaleString("en-IN")}
    </p>
  );
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
