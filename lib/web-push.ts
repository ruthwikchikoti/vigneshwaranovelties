import "server-only";

/**
 * Edge-compatible Web Push implementation using only the Web Crypto API.
 *
 * No Node.js crypto or npm packages — works on Cloudflare Workers,
 * Vercel Edge Functions, Deno Deploy, etc.
 *
 * Implements:
 *  - VAPID JWT generation (ES256 / ECDSA P-256)
 *  - Web Push payload encryption per RFC 8291 (aes128gcm content encoding)
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type PushTarget = {
  endpoint: string;
  key_p256dh: string;
  key_auth: string;
};

export type VapidConfig = {
  subject: string; // e.g. "mailto:owner@example.com"
  publicKey: string; // base64url-encoded 65-byte uncompressed point
  privateKey: string; // base64url-encoded 32-byte raw scalar
};

// ─── Typed-buffer helper ────────────────────────────────────────────────
// TypeScript 5.x generic Uint8Array types can disagree on ArrayBufferLike
// vs ArrayBuffer. This ensures we always have a fresh Uint8Array<ArrayBuffer>
// that satisfies the Web Crypto BufferSource overloads.

function buf(data: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(data) as Uint8Array<ArrayBuffer>;
}

// ─── Base64url helpers ──────────────────────────────────────────────────

/** @internal Exported for testing. */
export function base64urlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** @internal Exported for testing. */
export function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  // Restore standard base64 characters
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Text encoder singleton ─────────────────────────────────────────────

const encoder = new TextEncoder();

// ─── VAPID key import ───────────────────────────────────────────────────

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const publicKeyBytes = base64urlDecode(publicKeyB64);

  // Public key is a 65-byte uncompressed point: 0x04 || x (32) || y (32)
  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));
  const d = privateKeyB64; // Already base64url

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
    ext: true,
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { privateKey, publicKeyBytes };
}

// ─── VAPID JWT generation ───────────────────────────────────────────────

async function generateVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Web Crypto may return DER-encoded signature — we need raw r||s (64 bytes)
  const signature = ensureRawSignature(new Uint8Array(signatureBuffer));
  const signatureB64 = base64urlEncode(signature);

  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Ensure the ECDSA signature is in raw r||s format (64 bytes).
 * Web Crypto on some platforms returns DER encoding; convert if needed.
 */
/** @internal Exported for testing. */
export function ensureRawSignature(sig: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw
  if (sig.length === 64) return sig;

  // DER decoding: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  if (sig[0] !== 0x30) {
    throw new Error("Unexpected ECDSA signature format");
  }

  let offset = 2; // skip 0x30 and total length

  // Parse r
  if (sig[offset] !== 0x02) throw new Error("Expected integer tag for r");
  offset++;
  const rLen = sig[offset];
  offset++;
  let r = sig.slice(offset, offset + rLen);
  offset += rLen;

  // Parse s
  if (sig[offset] !== 0x02) throw new Error("Expected integer tag for s");
  offset++;
  const sLen = sig[offset];
  offset++;
  let s = sig.slice(offset, offset + sLen);

  // Remove leading zero padding (DER uses signed integers)
  if (r.length === 33 && r[0] === 0) r = r.slice(1);
  if (s.length === 33 && s[0] === 0) s = s.slice(1);

  // Pad to 32 bytes each if shorter
  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}

// ─── HKDF using Web Crypto ──────────────────────────────────────────────

async function hkdfDerive(
  salt: BufferSource,
  ikm: BufferSource,
  info: BufferSource,
  length: number
): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    keyMaterial,
    length * 8
  );

  return new Uint8Array(derived);
}

// ─── Concatenation helper ───────────────────────────────────────────────

function concat(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ─── Web Push payload encryption (RFC 8291, aes128gcm) ─────────────────

async function encryptPayload(
  plaintext: Uint8Array,
  subscriberP256dh: Uint8Array<ArrayBuffer>,
  subscriberAuth: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  // 1. Import subscriber's p256dh as ECDH public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberP256dh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 2. Generate ephemeral ECDH P-256 key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // 3. Derive shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      ephemeralKeyPair.privateKey,
      256
    )
  );

  // Export ephemeral public key (raw, 65 bytes uncompressed)
  const ephemeralPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey)
  );

  // 4. Derive IKM via HKDF
  //    PRK = HKDF-Extract(salt=auth, ikm=sharedSecret)
  //    IKM = HKDF-Expand(PRK, info="WebPush: info\0" || subscriberP256dh || ephemeralPublicKey, 32)
  const webPushInfoPrefix = encoder.encode("WebPush: info\0");
  const ikmInfo = concat(webPushInfoPrefix, subscriberP256dh, ephemeralPublicKey);
  const ikm = await hkdfDerive(subscriberAuth, sharedSecret, ikmInfo, 32);

  // 5. Generate random 16-byte salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. Derive CEK (16 bytes) and nonce (12 bytes) via HKDF
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

  const cek = await hkdfDerive(salt, ikm, cekInfo, 16);
  const nonce = await hkdfDerive(salt, ikm, nonceInfo, 12);

  // 7. Pad the plaintext: append 0x02 delimiter (final record, per RFC 8188)
  const paddedPlaintext = concat(buf(plaintext), new Uint8Array([0x02]));

  // 8. Encrypt with AES-128-GCM
  const cekKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      cekKey,
      paddedPlaintext
    )
  );

  // 9. Build the aes128gcm binary frame:
  //    salt (16) || record size uint32BE (4) || keyid length uint8 (1=65) || ephemeral public key (65) || encrypted record
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false); // big-endian

  const keyIdLength = new Uint8Array([65]); // ephemeral public key is 65 bytes

  return concat(salt, recordSize, keyIdLength, ephemeralPublicKey, ciphertext);
}

// ─── Send Web Push ──────────────────────────────────────────────────────

export async function sendWebPush(
  target: PushTarget,
  payload: string,
  vapid: VapidConfig
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    // Parse the audience (origin) from the endpoint URL
    const endpointUrl = new URL(target.endpoint);
    const audience = endpointUrl.origin;

    // Import VAPID keys and generate JWT
    const { privateKey } = await importVapidKeys(vapid.publicKey, vapid.privateKey);
    const jwt = await generateVapidJwt(audience, vapid.subject, privateKey);

    // Encrypt the payload
    const p256dhBytes = base64urlDecode(target.key_p256dh);
    const authBytes = base64urlDecode(target.key_auth);
    const payloadBytes = encoder.encode(payload);
    const encryptedBody = await encryptPayload(payloadBytes, p256dhBytes, authBytes);

    // POST to the push service
    const response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: encryptedBody,
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { success: true, status: response.status };
    }

    const errorText = await response.text().catch(() => "");
    return {
      success: false,
      status: response.status,
      error: `Push service returned ${response.status}: ${errorText || response.statusText}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
