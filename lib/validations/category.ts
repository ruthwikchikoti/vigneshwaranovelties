import { z } from "zod";

export const categoryPayloadSchema = z.object({
  slug: z.string().min(2),
  name_en: z.string().min(2),
  name_te: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_te: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_url: z.string().url().optional().nullable().or(z.literal("")),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean(),
  parent_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

export type CategoryPayload = z.infer<typeof categoryPayloadSchema>;

export const bannerPayloadSchema = z.object({
  title: z.string().min(2),
  desktop_image_url: z.string().url().optional().nullable().or(z.literal("")),
  mobile_image_url: z.string().url().optional().nullable().or(z.literal("")),
  link_url: z.string().optional().nullable().or(z.literal("")),
  position: z.enum(["hero", "promo", "seasonal"]).default("hero"),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean(),
  badge_text: z.string().max(40, "Keep it under 40 characters").optional().nullable().or(z.literal("")),
});
export type BannerPayload = z.infer<typeof bannerPayloadSchema>;

export const offerPayloadSchema = z.object({
  title_en: z.string().min(2),
  title_te: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_te: z.string().optional().nullable(),
  banner_url: z.string().url().optional().nullable().or(z.literal("")),
  discount_pct: z.coerce.number().int().min(0).max(99).optional().nullable(),
  starts_at: z.string().optional().nullable().or(z.literal("")),
  ends_at: z.string().optional().nullable().or(z.literal("")),
  is_active: z.boolean(),
  category_id: z.string().uuid().optional().nullable().or(z.literal("")),
});
export type OfferPayload = z.infer<typeof offerPayloadSchema>;
