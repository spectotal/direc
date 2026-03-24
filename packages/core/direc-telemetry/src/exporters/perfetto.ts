import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Span } from "../tracer.js";
import {
  buildThreadMap,
  resolveThread,
  sanitizeArgs,
  toUs,
  type TraceEvent,
} from "./perfetto-format.js";

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
