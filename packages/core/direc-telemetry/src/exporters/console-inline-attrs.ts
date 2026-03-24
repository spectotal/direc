import type { Span } from "../tracer.js";
import { CONSOLE_ANSI as A, formatConsoleText as c } from "./console-style.js";

export function formatInlineAttrs(span: Span): string {
  const parts = [...formatRunAttrs(span), ...formatPluginAttrs(span)];
  return parts.length > 0 ? `  ${parts.join("  ")}` : "";
}

function formatRunAttrs(span: Span): string[] {
  if (span.name !== "direc/run") {
    return [];
  }

  const parts: string[] = [];
  pushValue(parts, span.attrs["eventType"], (value) => c(String(value), A.cyan));
  pushValue(parts, span.attrs["changeId"], formatChangeId);
  pushValue(parts, span.attrs["totalFindings"], (value) => c(`${value} findings`, A.gray));
  pushEnabled(parts, span.attrs["enabled"]);
  return parts;
}

function formatPluginAttrs(span: Span): string[] {
  if (!span.name.startsWith("plugin:")) {
    return [];
  }

  const parts: string[] = [];
  pushValue(parts, span.attrs["findings"], (value) => c(`${value} findings`, A.gray));
  pushValue(parts, span.attrs["filesAnalyzed"], (value) => c(`${value} files`, A.dim));
  return parts;
}

function pushEnabled(parts: string[], value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    return;
  }

  parts.push(c(`[${value.join(", ")}]`, A.dim));
}

function pushValue(
  parts: string[],
  value: unknown,
  formatter: (value: unknown) => string | undefined,
): void {
  const formatted = formatter(value);
  if (formatted) {
    parts.push(formatted);
  }
}

function formatChangeId(value: unknown): string | undefined {
  return value && value !== "(none)" ? c(String(value), A.yellow) : undefined;
}
