import { NextResponse } from "next/server";
import { buildInfo } from "@/lib/observability/version";

export const dynamic = "force-dynamic";

/** Which build is serving this request — used to verify a rollout or rollback. */
export function GET() {
  return NextResponse.json(
    { ...buildInfo(), pod: process.env.POD_NAME ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
