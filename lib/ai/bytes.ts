/**
 * Edge-runtime-safe base64 <-> bytes helpers + a SHA-256 fingerprint.
 * No Node Buffer dependency — uses atob/btoa and WebCrypto, both available on
 * the Next.js edge runtime.
 */

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000; // 32KB chunks keep String.fromCharCode within arg limits
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Stable SHA-256 hex of an arbitrary string (used for job idempotency keys). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Fingerprint a generation request from the ordered source URLs + variant
 * count + model. Re-running with the same inputs yields the same fingerprint,
 * which the unique index on ai_image_jobs uses to dedupe.
 */
export async function sourceFingerprint(
  sourceUrls: string[],
  count: number,
  modelId: string
): Promise<string> {
  const payload = JSON.stringify({
    urls: [...sourceUrls].sort(),
    count,
    model: modelId,
  });
  return sha256Hex(payload);
}
