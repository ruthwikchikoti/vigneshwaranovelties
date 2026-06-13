/**
 * Generate VAPID key pair for Web Push notifications.
 *
 * Usage: npx tsx scripts/generate-vapid-keys.ts
 *
 * Outputs env var lines ready to paste into .env or Cloudflare dashboard.
 * This is a standalone Node.js script — NOT edge-compatible.
 */

import crypto from "node:crypto";

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}

// Generate an ECDSA P-256 key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

// Export public key as 65-byte uncompressed point (0x04 || x || y)
const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
// The last 65 bytes of the SPKI DER encoding are the uncompressed point
const uncompressedPoint = publicKeyDer.subarray(publicKeyDer.length - 65);
const publicKeyB64url = base64urlEncode(uncompressedPoint);

// Export private key as 32-byte raw scalar (d value)
const privateKeyJwk = privateKey.export({ format: "jwk" });
// The 'd' field in JWK is already base64url-encoded
const privateKeyB64url = privateKeyJwk.d!;

console.log("\n# Web Push (VAPID) keys — paste into .env or Cloudflare dashboard\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyB64url}`);
console.log(`VAPID_PRIVATE_KEY=${privateKeyB64url}`);
console.log("");
