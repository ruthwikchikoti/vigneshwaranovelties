import { z } from "zod";

export const productPayloadSchema = z.object({
  title_en: z.string().min(2),
  title_te: z.string().optional().nullable(),
  slug: z.string().optional().default(""),
  sku: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_te: z.string().optional().nullable(),
  price_inr: z.coerce.number().min(0),
  discount_price_inr: z.coerce.number().min(0).nullable().optional(),
  category_id: z.string().min(1),
  tags: z.array(z.string()).default([]),
  stock_status: z.enum(["in_stock", "made_to_order", "sold_out"]),
  is_featured: z.boolean(),
  is_trending: z.boolean(),
  is_new_arrival: z.boolean(),
  has_sale_badge: z.boolean(),
  has_offer_badge: z.boolean(),
  is_active: z.boolean(),
  images: z.array(z.string().url()).default([]),
});

export type ProductPayload = z.infer<typeof productPayloadSchema>;
