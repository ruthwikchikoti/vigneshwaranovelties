import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

/**
 * Application metrics exposed at /api/metrics for Prometheus.
 *
 * HTTP request rate / error rate / latency for every route is measured at the
 * ingress controller (what users actually experience). The metrics here cover
 * what the ingress cannot see: Node.js process health and business outcomes
 * such as whether an inquiry was really saved.
 *
 * Next.js may load this module more than once (one copy per route bundle), so
 * the registry lives on globalThis to avoid "metric already registered" errors.
 */
type AppMetrics = {
  registry: Registry;
  inquiries: Counter<"result">;
  dependencyLatency: Histogram<"dependency" | "outcome">;
};

const g = globalThis as typeof globalThis & { __appMetrics?: AppMetrics };

function create(): AppMetrics {
  const registry = new Registry();
  registry.setDefaultLabels({ app: "vigneshwara-web" });
  collectDefaultMetrics({ register: registry });

  const info = new Gauge({
    name: "app_build_info",
    help: "Build information for the running version (value is always 1)",
    labelNames: ["version", "commit"],
    registers: [registry],
  });
  info.set(
    { version: process.env.APP_VERSION ?? "dev", commit: process.env.GIT_SHA ?? "unknown" },
    1,
  );

  return {
    registry,
    inquiries: new Counter({
      name: "app_inquiries_total",
      help: "Customer inquiries received, by result",
      labelNames: ["result"],
      registers: [registry],
    }),
    dependencyLatency: new Histogram({
      name: "app_dependency_request_duration_seconds",
      help: "Latency of calls to external dependencies",
      labelNames: ["dependency", "outcome"],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
  };
}

export const metrics: AppMetrics = (g.__appMetrics ??= create());
