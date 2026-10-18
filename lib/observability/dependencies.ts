import { metrics } from "./metrics";

export type DependencyCheck = { name: string; ok: boolean; latencyMs: number; error?: string };

/**
 * Checks that Supabase (Postgres via PostgREST) answers a real catalog query.
 * Uses the public anon key and a table that is readable under RLS, so this
 * follows the same path a storefront page does.
 */
export async function checkSupabase(timeoutMs = 2000): Promise<DependencyCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const started = performance.now();
  const done = (ok: boolean, error?: string): DependencyCheck => {
    const latencyMs = Math.round(performance.now() - started);
    metrics.dependencyLatency.observe(
      { dependency: "supabase", outcome: ok ? "success" : "failure" },
      latencyMs / 1000,
    );
    return { name: "supabase", ok, latencyMs, ...(error ? { error } : {}) };
  };

  if (!url || !key) return done(false, "not_configured");
  try {
    const res = await fetch(`${url}/rest/v1/categories?select=id&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok ? done(true) : done(false, `http_${res.status}`);
  } catch (err) {
    return done(false, err instanceof Error ? err.name : "fetch_failed");
  }
}
