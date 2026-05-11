/*
 * One-shot admin user creator — bypasses Supabase Auth's email rate limits.
 *
 * Usage:
 *   npm run admin:create -- vigneshwaranovelties@gmail.com YourPasswordHere
 *
 * Talks directly to Supabase Auth's Admin REST API (no supabase-js client),
 * so it works on Node 20 without the WebSocket polyfill the realtime client
 * needs.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, key, rawVal] = m;
      const val = rawVal.replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // no .env.local — assume real env is already populated
  }
}
loadEnvLocal();

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: npm run admin:create -- <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || url.includes("placeholder") || serviceKey.includes("placeholder")) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function findUserByEmail(emailToFind: string) {
  // GET /auth/v1/admin/users?email=foo@bar (perPage 1000)
  const res = await fetch(
    `${url}/auth/v1/admin/users?per_page=1000`,
    { headers: baseHeaders }
  );
  if (!res.ok) {
    throw new Error(`listUsers failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { users?: Array<{ id: string; email: string }> };
  return (body.users ?? []).find(
    (u) => u.email?.toLowerCase() === emailToFind.toLowerCase()
  );
}

async function createUser(emailToCreate: string, pw: string) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      email: emailToCreate,
      password: pw,
      email_confirm: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`createUser failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function updatePassword(userId: string, pw: string) {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: baseHeaders,
    body: JSON.stringify({ password: pw, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`updateUser failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const found = await findUserByEmail(email);
  if (found) {
    console.log(`→ user ${email} already exists, updating password…`);
    await updatePassword(found.id, password);
    console.log("✓ password updated. Sign in at /admin/login.");
    return;
  }
  console.log(`→ creating user ${email}…`);
  await createUser(email, password);
  console.log("✓ admin created. Sign in at /admin/login.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
