import { registerOTel } from "@vercel/otel";

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
  });
}
