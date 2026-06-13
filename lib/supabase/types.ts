export type Locale = "en" | "te";

export type Category = {
  id: string;
  slug: string;
  parent_id: string | null;
  name_en: string;
  name_te: string | null;
  description_en: string | null;
  description_te: string | null;
  image_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type AiStatus = "none" | "pending" | "approved" | "rejected";

export type ProductImage = {
  id: string;
  product_id: string;
  original_url: string;
  optimized_url: string | null;
  ai_generated_url: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  /** 'none' = an original owner photo; otherwise an AI variant's review state. */
  ai_status: AiStatus;
  ai_variant: string | null;
  ai_prompt: string | null;
  ai_model: string | null;
  ai_job_id: string | null;
};

export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "partial";

export type AiImageJob = {
  id: string;
  product_id: string;
  source_fingerprint: string;
  status: AiJobStatus;
  model: string | null;
  variants_total: number;
  variants_done: number;
  variants_failed: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type StockStatus = "in_stock" | "made_to_order" | "sold_out";

export type Product = {
  id: string;
  slug: string;
  sku: string | null;
  title_en: string;
  title_te: string | null;
  description_en: string | null;
  description_te: string | null;
  price_inr: number;
  discount_price_inr: number | null;
  category_id: string | null;
  tags: string[] | null;
  stock_status: StockStatus;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  has_sale_badge: boolean;
  has_offer_badge: boolean;
  video_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  category?: Category | null;
};

export type Offer = {
  id: string;
  title_en: string;
  title_te: string | null;
  description_en: string | null;
  description_te: string | null;
  banner_url: string | null;
  discount_pct: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  /** When set, the offer's discount_pct applies to every product in this category. */
  category_id: string | null;
};

export type Banner = {
  id: string;
  title: string;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  link_url: string | null;
  position: "hero" | "promo" | "seasonal";
  sort_order: number;
  is_active: boolean;
  /** Optional overlay label rendered on the hero image (e.g. "DIWALI EDIT"). */
  badge_text: string | null;
};

export type InquiryItem = {
  product_id: string;
  qty: number;
  snapshot: { title: string; price: number; image: string; slug: string };
};

export type Inquiry = {
  id: string;
  customer_name: string;
  mobile: string;
  address: string | null;
  message: string | null;
  items: InquiryItem[];
  status: "new" | "contacted" | "completed" | "spam";
  source: "buy_now" | "cart" | "whatsapp_redirect";
  created_at: string;
  contacted_at: string | null;
  notes: string | null;
};

export type CmsPage = {
  id: string;
  slug: string;
  title_en: string;
  title_te: string | null;
  content_en: string | null;
  content_te: string | null;
  /** Optional hero image rendered above the body on the public page. */
  image_url: string | null;
  updated_at: string;
};

export type Localized<T> = T & { __locale?: Locale };

export function localize<T extends Record<string, unknown>>(
  row: T,
  locale: Locale,
  field: string
): string {
  const localized = row[`${field}_${locale}` as keyof T];
  const fallback = row[`${field}_en` as keyof T];
  return (localized as string) || (fallback as string) || "";
}
