import { metrics } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

/**
 * Prometheus scrape endpoint. When METRICS_TOKEN is set (it is in
 * Kubernetes), a matching bearer token is required so the metrics are not
 * readable by anyone hitting the public ingress.
 */
export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN;
  if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(await metrics.registry.metrics(), {
    headers: { "content-type": metrics.registry.contentType, "cache-control": "no-store" },
  });
}
