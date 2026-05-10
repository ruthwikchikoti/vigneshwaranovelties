import { z } from "zod";

export const inquirySchema = z.object({
  customer_name: z.string().trim().min(2, "name").max(120),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "mobile"),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  source: z.enum(["buy_now", "cart", "whatsapp_redirect"]),
  items: z
    .array(
      z.object({
        product_id: z.string(),
        qty: z.number().int().min(1).max(99),
        snapshot: z.object({
          title: z.string(),
          price: z.number(),
          image: z.string(),
          slug: z.string(),
        }),
      })
    )
    .min(1, "items"),
  hp: z.string().optional(), // honeypot
});

export type InquiryInput = z.infer<typeof inquirySchema>;
