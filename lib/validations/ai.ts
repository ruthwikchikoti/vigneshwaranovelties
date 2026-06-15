import { z } from "zod";

export const enqueueSchema = z.object({
  productId: z.string().uuid(),
  /** Force a fresh run even if a job with the same fingerprint exists. */
  force: z.boolean().optional().default(false),
});

export const generateSchema = z.object({
  jobId: z.string().uuid(),
  index: z.coerce.number().int().min(0).max(7),
});

export const reviewSchema = z.object({
  imageId: z.string().uuid(),
  action: z.enum(["approve", "reject", "delete"]),
});

export const describeSchema = z.object({
  images: z.array(z.string().url()).min(1).max(6),
  title: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

export type EnqueuePayload = z.infer<typeof enqueueSchema>;
export type GeneratePayload = z.infer<typeof generateSchema>;
export type ReviewPayload = z.infer<typeof reviewSchema>;
export type DescribePayload = z.infer<typeof describeSchema>;
