import "server-only";
import { isBedrockConfigured } from "./config";
import { removeBackground } from "./bedrock";

export type Cutout = {
  /** Transparent PNG bytes of the isolated product (or the original in mock). */
  bytes: Uint8Array;
  /** True when produced by the dev mock (no Bedrock spend). */
  mock: boolean;
};

/**
 * Produce a background-removed cutout of the product.
 *
 * Real path: Bedrock "Remove Background" → transparent PNG (the exact piece).
 * Dev mock (no AWS creds): returns the original bytes unchanged so the
 * compositing/review/publish flow still works end-to-end at zero cost.
 */
export async function produceCutout(sourceBytes: Uint8Array): Promise<Cutout> {
  if (!isBedrockConfigured()) {
    return { bytes: sourceBytes, mock: true };
  }
  const bytes = await removeBackground(sourceBytes);
  return { bytes, mock: false };
}
