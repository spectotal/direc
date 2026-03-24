import type { Span } from "../tracer.js";

export interface TraceEvent {
  ph: "X" | "M";
  name: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}

export function toUs(ms: number): number {
  return Math.round(ms * 1000);
}

export function buildThreadMap(spans: Span[]): Map<string, number> {
  const map = new Map<string, number>();
  let tid = 1;

  for (const span of spans) {
    if (!span.parentId) {
      map.set(span.id, tid++);
    }
  }

  return map;
}

export function resolveThread(
  span: Span,
  spanById: Map<string, Span>,
  threadMap: Map<string, number>,
): number {
  let current: Span | undefined = span;
  while (current) {
    const tid = threadMap.get(current.id);
    if (tid !== undefined) {
      return tid;
    }
    current = current.parentId ? spanById.get(current.parentId) : undefined;
  }
  return 1;
}

export function sanitizeArgs(attrs: Record<string, unknown>): Record<string, unknown> {
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
