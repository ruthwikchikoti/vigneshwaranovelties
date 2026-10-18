import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe. Answers "is the Node.js process able to serve a request?"
 * It deliberately checks nothing external: if Supabase is down, restarting
 * this pod would not fix it, it would only add restarts on top of the outage.
 */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
}
