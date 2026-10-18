import { registerOTel } from "@vercel/otel";
import { trace, TraceFlags, type Attributes, type Context } from "@opentelemetry/api";

/**
 * Tracing setup. Next.js already creates spans for incoming requests, route
 * handlers, rendering and outgoing fetch() calls (Supabase, Brevo); this only
 * decides where to send them. Export is enabled only when an OTLP endpoint is
 * configured (in Kubernetes it points at Jaeger), so local dev is unaffected.
 */
export function register() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "vigneshwara-web",
    attributes: {
      "service.version": process.env.APP_VERSION ?? "dev",
      "vcs.revision": process.env.GIT_SHA ?? "unknown",
    },
    traceSampler: skipProbeTraffic,
  });
}

// SamplingDecision values from @opentelemetry/sdk-trace-base.
const NOT_RECORD = 0;
const RECORD_AND_SAMPLED = 2;
const PROBE_PATHS = /\/api\/(health|ready|metrics)\b/;

/**
 * Kubelet probes and Prometheus scrapes hit the pods every few seconds and
 * would make up almost every stored trace. Drop those, keep everything else,
 * and let child spans follow their parent's decision.
 */
const skipProbeTraffic = {
  shouldSample(ctx: Context, _traceId: string, spanName: string, _kind: unknown, attrs: Attributes) {
    const parent = trace.getSpanContext(ctx);
    if (parent && trace.isSpanContextValid(parent)) {
      const sampled = (parent.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
      return { decision: sampled ? RECORD_AND_SAMPLED : NOT_RECORD };
    }
    const target = `${spanName} ${attrs["http.target"] ?? ""} ${attrs["url.path"] ?? ""}`;
    return { decision: PROBE_PATHS.test(target) ? NOT_RECORD : RECORD_AND_SAMPLED };
  },
  toString: () => "SkipProbeTraffic",
};
