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

export type EnqueuePayload = z.infer<typeof enqueueSchema>;
export type GeneratePayload = z.infer<typeof generateSchema>;
export type ReviewPayload = z.infer<typeof reviewSchema>;
