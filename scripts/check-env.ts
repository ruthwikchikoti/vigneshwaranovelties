/**
 * Verify environment variables — presence + live service pings — so you don't
 * have to eyeball the Vercel dashboard.
 *
 *   npx tsx scripts/check-env.ts            # check .env.local + ping services
 *   npx tsx scripts/check-env.ts --no-ping  # presence only (offline)
 *
 * To verify what's ACTUALLY set in Vercel (production):
 *   vercel env pull .env.vercel.local --environment=production
 *   npx tsx scripts/check-env.ts            # (reads .env.vercel.local too)
 */
import { existsSync, readFileSync } from "node:fs";

const PING = !process.argv.includes("--no-ping");
const SEND_TEST = process.argv.includes("--send-test");

function loadFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
// process.env wins (Vercel/CI); local files fill in for dev.
const env: Record<string, string | undefined> = {
  ...loadFile(".env.local"),
  ...loadFile(".env.vercel.local"),
  ...process.env,
};

const has = (k: string) => {
  const v = env[k];
  return Boolean(v && v.trim() && !v.toLowerCase().includes("placeholder") && !v.includes("your-"));
};

type Group = { title: string; required: string[]; optional?: string[] };
const GROUPS: Group[] = [
  { title: "Supabase", required: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
  { title: "ImageKit", required: ["NEXT_PUBLIC_IMAGEKIT_URL"] },
  { title: "Email (Brevo)", required: ["BREVO_API_KEY", "BREVO_FROM_EMAIL", "INQUIRY_NOTIFICATION_EMAIL"] },
  { title: "Site / Owner", required: ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_NAME", "NEXT_PUBLIC_WHATSAPP_NUMBER", "NEXT_PUBLIC_OWNER_PHONE", "NEXT_PUBLIC_OWNER_EMAIL"] },
  { title: "OpenAI (category/banner images)", required: [], optional: ["OPENAI_API_KEY"] },
  { title: "Web Push (optional)", required: [], optional: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] },
  { title: "Bedrock product AI (optional)", required: [], optional: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "BEDROCK_IMAGE_MODEL_ID"] },
];

let problems = 0;

function line(ok: boolean, label: string, note = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${label}${note ? `  — ${note}` : ""}`);
}

console.log(`\nEnvironment check (${PING ? "with live pings" : "presence only"})\n`);

for (const g of GROUPS) {
  console.log(`▸ ${g.title}`);
  for (const k of g.required) {
    const ok = has(k);
    if (!ok) problems++;
    line(ok, k, ok ? "" : "MISSING / placeholder");
  }
  for (const k of g.optional ?? []) {
    const ok = has(k);
    line(ok, `${k} (optional)`, ok ? "" : "not set");
  }
  console.log("");
}

// SITE_URL sanity
if (has("NEXT_PUBLIC_SITE_URL") && /localhost|127\.0\.0\.1/.test(env.NEXT_PUBLIC_SITE_URL!)) {
  console.log("⚠️  NEXT_PUBLIC_SITE_URL is localhost — set it to your real domain in Vercel.\n");
}

async function ping(label: string, fn: () => Promise<{ ok: boolean; note: string }>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const { ok, note } = await fn();
    if (!ok) problems++;
    line(ok, label, note);
  } catch (e) {
    problems++;
    line(false, label, e instanceof Error ? e.message.slice(0, 60) : "error");
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (PING) {
    console.log("▸ Live service checks");
    if (has("NEXT_PUBLIC_SUPABASE_URL") && has("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      await ping("Supabase reachable", async () => {
        const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        });
        return { ok: r.status < 500, note: `HTTP ${r.status}` };
      });
    }
    if (has("OPENAI_API_KEY")) {
      await ping("OpenAI key valid", async () => {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
        });
        return { ok: r.ok, note: r.ok ? "200" : `HTTP ${r.status} (bad key?)` };
      });
    }
    if (has("BREVO_API_KEY")) {
      if (SEND_TEST) {
        // Definitive check: actually send a transactional email via the SAME
        // endpoint the app uses (works for transactional-scoped keys too).
        await ping("Brevo send test", async () => {
          const to = env.INQUIRY_NOTIFICATION_EMAIL || env.BREVO_FROM_EMAIL!;
          const r = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({
              sender: { email: env.BREVO_FROM_EMAIL, name: env.BREVO_FROM_NAME || "Vigneshwara Novelties" },
              to: [{ email: to }],
              subject: "Env check — test email",
              htmlContent: "<p>This is an automated test from check-env. Brevo is working.</p>",
            }),
          });
          const body = await r.text().catch(() => "");
          return { ok: r.ok, note: r.ok ? `sent to ${to}` : `HTTP ${r.status}: ${body.slice(0, 90)}` };
        });
      } else {
        // Soft check: /account needs an account-scoped key. A 401 here often
        // just means the key is transactional-only (still sends fine) — so we
        // DON'T count it as a failure; suggest --send-test to confirm.
        const r = await fetch("https://api.brevo.com/v3/account", {
          headers: { "api-key": env.BREVO_API_KEY! },
        }).catch(() => null);
        if (r && r.ok) line(true, "Brevo key valid", "200 (account scope)");
        else line(true, "Brevo key present", `/account → ${r ? `HTTP ${r.status}` : "no response"}; run with --send-test to verify sending`);
      }
    }
    if (has("NEXT_PUBLIC_IMAGEKIT_URL")) {
      await ping("ImageKit reachable", async () => {
        const r = await fetch(`${env.NEXT_PUBLIC_IMAGEKIT_URL}/`, { method: "HEAD" });
        return { ok: r.status < 500, note: `HTTP ${r.status}` };
      });
    }
    console.log("");
  }

  if (problems === 0) {
    console.log("🎉 All required env vars present and services reachable.\n");
    process.exit(0);
  } else {
    console.log(`⚠️  ${problems} problem(s) above. Fix them before relying on the deploy.\n`);
    process.exit(1);
  }
}

main();
