/**
 * Unit tests for lib/web-push.ts
 *
 * Run with: npx tsx scripts/tests/test-web-push.ts
 *
 * These tests exercise the base64url helpers, VAPID JWT structure,
 * DER-to-raw signature conversion, and the full sendWebPush flow
 * (with a mocked fetch).
 */

import { strict as assert } from "node:assert";
import { createRequire } from "node:module";

// Mock "server-only" so we can import lib/web-push.ts in a test context
const require = createRequire(import.meta.url);
require("module").Module._cache = require("module").Module._cache || {};
// Register a no-op module for "server-only"
const Module = require("module");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request === "server-only") return request;
  return originalResolveFilename.call(this, request, ...args);
};
const originalLoad = Module._load;
Module._load = function (request: string, ...args: unknown[]) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...args);
};

// ─── Tests ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      console.log(`  PASS: ${name}`);
    })
    .catch((err) => {
      failed++;
      console.error(`  FAIL: ${name}`);
      console.error(`        ${err.message}`);
    });
}

async function run() {
  // Import helpers directly from the module (they're exported for testing).
  // Dynamic import so it runs after the server-only mock is registered above.
  const {
    base64urlEncode,
    base64urlDecode,
    ensureRawSignature,
    sendWebPush,
  } = await import("../../lib/web-push.js");

  console.log("\n=== web-push unit tests ===\n");

  // ── base64url roundtrip ──

  await test("base64urlEncode/Decode roundtrip — empty", () => {
    const input = new Uint8Array([]);
    const encoded = base64urlEncode(input);
    const decoded = base64urlDecode(encoded);
    assert.equal(decoded.length, 0);
  });

  await test("base64urlEncode/Decode roundtrip — simple bytes", () => {
    const input = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
    const encoded = base64urlEncode(input);
    const decoded = base64urlDecode(encoded);
    assert.deepEqual(Array.from(decoded), Array.from(input));
  });

  await test("base64urlEncode/Decode roundtrip — 65 bytes (public key size)", () => {
    const input = new Uint8Array(65);
    input[0] = 0x04; // uncompressed point prefix
    for (let i = 1; i < 65; i++) input[i] = i;
    const encoded = base64urlEncode(input);
    const decoded = base64urlDecode(encoded);
    assert.deepEqual(Array.from(decoded), Array.from(input));
  });

  await test("base64urlEncode produces URL-safe characters", () => {
    // Bytes that would produce + and / in standard base64
    const input = new Uint8Array([251, 255, 254, 253, 63, 62]);
    const encoded = base64urlEncode(input);
    assert.ok(!encoded.includes("+"), "Should not contain +");
    assert.ok(!encoded.includes("/"), "Should not contain /");
    assert.ok(!encoded.includes("="), "Should not contain padding =");
  });

  await test("base64urlDecode handles padding correctly", () => {
    // "AQID" decodes to [1, 2, 3] — no padding needed
    const decoded1 = base64urlDecode("AQID");
    assert.deepEqual(Array.from(decoded1), [1, 2, 3]);

    // "AQ" decodes to [1] — needs 2 padding chars
    const decoded2 = base64urlDecode("AQ");
    assert.deepEqual(Array.from(decoded2), [1]);
  });

  // ── ensureRawSignature ──

  await test("ensureRawSignature — already raw (64 bytes)", () => {
    const raw = new Uint8Array(64);
    for (let i = 0; i < 64; i++) raw[i] = i + 1;
    const result = ensureRawSignature(raw);
    assert.equal(result.length, 64);
    assert.deepEqual(Array.from(result), Array.from(raw));
  });

  await test("ensureRawSignature — DER encoded without leading zeros", () => {
    // Build a DER signature: 0x30 <len> 0x02 <32> <r[32]> 0x02 <32> <s[32]>
    const r = new Uint8Array(32).fill(0xAA);
    const s = new Uint8Array(32).fill(0xBB);
    const der = new Uint8Array(2 + 2 + 32 + 2 + 32);
    der[0] = 0x30;
    der[1] = 2 + 32 + 2 + 32;
    der[2] = 0x02;
    der[3] = 32;
    der.set(r, 4);
    der[36] = 0x02;
    der[37] = 32;
    der.set(s, 38);

    const result = ensureRawSignature(der);
    assert.equal(result.length, 64);
    assert.deepEqual(Array.from(result.slice(0, 32)), Array.from(r));
    assert.deepEqual(Array.from(result.slice(32, 64)), Array.from(s));
  });

  await test("ensureRawSignature — DER with leading zero padding", () => {
    // When the high bit is set, DER adds a 0x00 prefix
    const r = new Uint8Array(32).fill(0x80); // high bit set
    const s = new Uint8Array(32).fill(0x90); // high bit set
    const rDer = new Uint8Array(33);
    rDer[0] = 0x00;
    rDer.set(r, 1);
    const sDer = new Uint8Array(33);
    sDer[0] = 0x00;
    sDer.set(s, 1);

    const der = new Uint8Array(2 + 2 + 33 + 2 + 33);
    der[0] = 0x30;
    der[1] = 2 + 33 + 2 + 33;
    der[2] = 0x02;
    der[3] = 33;
    der.set(rDer, 4);
    der[37] = 0x02;
    der[38] = 33;
    der.set(sDer, 39);

    const result = ensureRawSignature(der);
    assert.equal(result.length, 64);
    assert.deepEqual(Array.from(result.slice(0, 32)), Array.from(r));
    assert.deepEqual(Array.from(result.slice(32, 64)), Array.from(s));
  });

  await test("ensureRawSignature — rejects non-DER, non-raw input", () => {
    const bad = new Uint8Array([0x99, 0x00, 0x00]);
    assert.throws(() => ensureRawSignature(bad), /Unexpected ECDSA signature format/);
  });

  // ── VAPID JWT structure ──

  await test("VAPID JWT — generates valid 3-part JWT with correct header", async () => {
    // Generate a real P-256 key pair
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: "https://fcm.googleapis.com",
      exp: now + 12 * 60 * 60,
      sub: "mailto:test@example.com",
    };

    const encoder = new TextEncoder();
    const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.privateKey,
      encoder.encode(unsignedToken)
    );

    const signature = ensureRawSignature(new Uint8Array(signatureBuffer));
    const signatureB64 = base64urlEncode(signature);
    const jwt = `${unsignedToken}.${signatureB64}`;

    // Verify JWT structure
    const parts = jwt.split(".");
    assert.equal(parts.length, 3, "JWT should have 3 parts");

    // Decode and verify header
    const decodedHeader = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[0]))
    );
    assert.equal(decodedHeader.typ, "JWT");
    assert.equal(decodedHeader.alg, "ES256");

    // Decode and verify payload
    const decodedPayload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[1]))
    );
    assert.equal(decodedPayload.aud, "https://fcm.googleapis.com");
    assert.equal(decodedPayload.sub, "mailto:test@example.com");
    assert.ok(decodedPayload.exp > now, "exp should be in the future");

    // Verify signature is 64 bytes (raw r||s)
    const sigBytes = base64urlDecode(parts[2]);
    assert.equal(sigBytes.length, 64, "Signature should be 64 bytes (raw r||s)");

    // Verify the signature is actually valid
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      keyPair.publicKey,
      sigBytes,
      encoder.encode(unsignedToken)
    );
    assert.ok(isValid, "Signature should verify correctly");
  });

  // ── sendWebPush integration (mock fetch) ──

  await test("sendWebPush — calls fetch with correct headers and encrypted body", async () => {
    // Generate VAPID keys
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
    const publicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Generate a subscriber key pair (simulating a browser subscription)
    const subscriberKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
    const subscriberPublicKey = new Uint8Array(
      await crypto.subtle.exportKey("raw", subscriberKeyPair.publicKey)
    );
    const subscriberAuth = crypto.getRandomValues(new Uint8Array(16));

    // Mock fetch
    let capturedRequest: { url: string; method: string; headers: Record<string, string>; body: Uint8Array } | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init: any) => {
      capturedRequest = {
        url: typeof input === "string" ? input : input.url,
        method: init?.method || "GET",
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: new Uint8Array(init?.body),
      };
      return new Response("", { status: 201 });
    };

    try {
      const result = await sendWebPush(
        {
          endpoint: "https://fcm.googleapis.com/fcm/send/test-subscription-id",
          key_p256dh: base64urlEncode(subscriberPublicKey),
          key_auth: base64urlEncode(subscriberAuth),
        },
        JSON.stringify({ title: "Test", body: "Hello" }),
        {
          subject: "mailto:test@example.com",
          publicKey: base64urlEncode(publicKeyRaw),
          privateKey: privateKeyJwk.d!,
        }
      );

      assert.ok(result.success, `sendWebPush should succeed, got: ${result.error}`);
      assert.equal(result.status, 201);

      // Verify the request
      assert.ok(capturedRequest, "fetch should have been called");
      assert.equal(capturedRequest!.url, "https://fcm.googleapis.com/fcm/send/test-subscription-id");
      assert.equal(capturedRequest!.method, "POST");
      assert.ok(capturedRequest!.headers["authorization"]?.startsWith("vapid t="), "Should have VAPID auth header");
      assert.equal(capturedRequest!.headers["content-encoding"], "aes128gcm");
      assert.equal(capturedRequest!.headers["content-type"], "application/octet-stream");
      assert.equal(capturedRequest!.headers["ttl"], "86400");
      assert.equal(capturedRequest!.headers["urgency"], "high");

      // Verify the body structure (aes128gcm frame)
      const body = capturedRequest!.body;
      assert.ok(body.length > 86, "Body should be at least 86 bytes (16 salt + 4 rs + 1 idlen + 65 key + encrypted)");

      // First 16 bytes = salt
      // Bytes 16-19 = record size (uint32 BE, should be 4096)
      const recordSize = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0, false);
      assert.equal(recordSize, 4096, "Record size should be 4096");

      // Byte 20 = key ID length (should be 65)
      assert.equal(body[20], 65, "Key ID length should be 65");

      // Bytes 21-85 = ephemeral public key (should start with 0x04)
      assert.equal(body[21], 0x04, "Ephemeral public key should start with 0x04 (uncompressed)");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ── Summary ──

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
