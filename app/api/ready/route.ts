import { NextResponse } from "next/server";
import { checkSupabase } from "@/lib/observability/dependencies";

export const dynamic = "force-dynamic";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

/**
 * Readiness probe. A pod is ready when its configuration is complete; a pod
 * missing secrets would fail every inquiry, so it must not receive traffic.
 *
 * Supabase reachability is NOT part of readiness by default: during a Supabase
 * outage every pod would turn unready at once and the ingress would return 503
 * even for catalog pages that are still served from the ISR cache. Pass
 * ?deps=1 (used by the deploy smoke test and monitoring) to include it.
 */
export async function GET(req: Request) {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  const includeDeps = new URL(req.url).searchParams.get("deps") === "1";
  const dependencies = includeDeps ? [await checkSupabase()] : [];
  const ok = missing.length === 0 && dependencies.every((d) => d.ok);

  return NextResponse.json(
    { status: ok ? "ready" : "not_ready", missingConfig: missing, dependencies },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
