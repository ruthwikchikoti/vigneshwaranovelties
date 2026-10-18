import { trace } from "@opentelemetry/api";

/**
 * Minimal structured logger. Writes one JSON object per line to stdout/stderr
 * so the log collector (Promtail → Loki) can parse fields without regexes.
 * When a trace is active, its trace_id is attached so a log line can be
 * opened in Jaeger and vice versa.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message };
  if (err && typeof err === "object") return err;
  return { message: String(err) };
}

function write(level: Level, msg: string, fields: Fields = {}) {
  const span = trace.getActiveSpan();
  const ctx = span?.spanContext();
  const entry: Fields = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: "vigneshwara-web",
    version: process.env.APP_VERSION ?? "dev",
    ...(ctx ? { trace_id: ctx.traceId, span_id: ctx.spanId } : {}),
    ...fields,
  };
  if ("err" in fields) entry.err = serializeError(fields.err);
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, fields?: Fields) => write("debug", msg, fields),
  info: (msg: string, fields?: Fields) => write("info", msg, fields),
  warn: (msg: string, fields?: Fields) => write("warn", msg, fields),
  error: (msg: string, fields?: Fields) => write("error", msg, fields),
};
