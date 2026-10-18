import { NextResponse } from "next/server";
import { buildInfo } from "@/lib/observability/version";
import { aiConfig } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

/**
 * Which build is serving this request, and which feature flags it has on.
 * Used to verify a rollout, a rollback or a flag change from outside the pod.
 */
export function GET() {
  return NextResponse.json(
    {
      ...buildInfo(),
      pod: process.env.POD_NAME ?? null,
      features: { aiGeneration: aiConfig().enabled },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
