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
  notifications: Counter<"channel" | "result">;
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

  const m: AppMetrics = {
    registry,
    inquiries: new Counter({
      name: "app_inquiries_total",
      help: "Customer inquiries received, by result",
      labelNames: ["result"],
      registers: [registry],
    }),
    notifications: new Counter({
      name: "app_notifications_total",
      help: "Owner notifications for new inquiries, by channel and result",
      labelNames: ["channel", "result"],
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

  // Start every outcome at 0. A series that first appears with value 1 has no
  // earlier sample, so increase() reads 0 and the first failure never alerts.
  for (const result of ["saved", "error", "duplicate", "invalid", "spam"]) m.inquiries.inc({ result }, 0);
  for (const result of ["sent", "failed"]) m.notifications.inc({ channel: "email", result }, 0);
  return m;
}

export const metrics: AppMetrics = (g.__appMetrics ??= create());
