import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Span } from "../tracer.js";

// Chrome DevTools / Perfetto "JSON Object Format"
// ts and dur must be in microseconds
// See: https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU

interface TraceEvent {
  ph: "X" | "M";
  name: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}

function toUs(ms: number): number {
  return Math.round(ms * 1000);
}

// Assign each root span its own thread so Perfetto shows them in separate lanes
function buildThreadMap(spans: Span[]): Map<string, number> {
  const map = new Map<string, number>();
  let tid = 1;
  for (const span of spans) {
    if (!span.parentId) {
      map.set(span.id, tid++);
    }
  }
  return map;
}

function resolveThread(
  span: Span,
  spanById: Map<string, Span>,
  threadMap: Map<string, number>,
): number {
  let current: Span | undefined = span;
  while (current) {
    const tid = threadMap.get(current.id);
    if (tid !== undefined) return tid;
    current = current.parentId ? spanById.get(current.parentId) : undefined;
  }
  return 1;
}

function sanitizeArgs(attrs: Record<string, unknown>): Record<string, unknown> {
  // Perfetto args must be primitives or simple objects
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      out[key] = val;
    } else if (Array.isArray(val)) {
      out[key] = val.join(", ");
    } else if (val !== null && val !== undefined) {
      out[key] = JSON.stringify(val);
    }
  }
  return out;
}

export async function writePerfettoTrace(
  spans: Span[],
  repositoryRoot: string,
): Promise<string | null> {
  const completed = spans.filter((s) => s.endMs !== undefined);
  if (completed.length === 0) return null;

  const baseTs = completed.reduce((min, s) => Math.min(min, s.startMs), Infinity);

  const spanById = new Map(spans.map((s) => [s.id, s]));
  const threadMap = buildThreadMap(spans);

  const events: TraceEvent[] = [];

  // Metadata: process name
  events.push({
    ph: "M",
    name: "process_name",
    ts: 0,
    pid: 1,
    tid: 0,
    args: { name: "direc" },
  });

  // Thread name metadata — one lane per root span
  for (const [spanId, tid] of threadMap) {
    const span = spanById.get(spanId);
    if (span) {
      events.push({
        ph: "M",
        name: "thread_name",
        ts: 0,
        pid: 1,
        tid,
        args: { name: span.attrs["changeId"] ?? span.name },
      });
    }
  }

  // Span events
  for (const span of completed) {
    const tid = resolveThread(span, spanById, threadMap);
    events.push({
      ph: "X",
      name: span.name,
      ts: toUs(span.startMs - baseTs),
      dur: toUs((span.endMs ?? span.startMs) - span.startMs),
      pid: 1,
      tid,
      args: {
        ...sanitizeArgs(span.attrs),
        status: span.status ?? "unknown",
        ...(span.errorMessage ? { error: span.errorMessage } : {}),
      },
    });
  }

  const traceDir = join(repositoryRoot, ".direc", "traces");
  await mkdir(traceDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(traceDir, `${timestamp}.json`);

  await writeFile(
    outPath,
    JSON.stringify({ traceEvents: events, displayTimeUnit: "ms" }, null, 2),
    "utf8",
  );

  return outPath;
}
