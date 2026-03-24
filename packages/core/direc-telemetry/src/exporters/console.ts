import type { Span } from "../tracer.js";

// ANSI codes — gracefully degrade when not a TTY
const isTTY = process.stderr.isTTY ?? false;

function ansi(code: string): string {
  return isTTY ? `\x1b[${code}m` : "";
}

const A = {
  reset: ansi("0"),
  bold: ansi("1"),
  dim: ansi("2"),
  red: ansi("31"),
  green: ansi("32"),
  yellow: ansi("33"),
  blue: ansi("34"),
  cyan: ansi("36"),
  gray: ansi("90"),
};

function c(text: string, ...codes: string[]): string {
  return `${codes.join("")}${text}${A.reset}`;
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function buildTree(spans: Span[]): Map<string | undefined, Span[]> {
  const tree = new Map<string | undefined, Span[]>();
  for (const span of spans) {
    const key = span.parentId;
    if (!tree.has(key)) tree.set(key, []);
    tree.get(key)!.push(span);
  }
  return tree;
}

function formatInlineAttrs(span: Span): string {
  const parts: string[] = [];

  if (span.name === "direc/run") {
    if (span.attrs["eventType"]) parts.push(c(String(span.attrs["eventType"]), A.cyan));
    if (span.attrs["changeId"] && span.attrs["changeId"] !== "(none)")
      parts.push(c(String(span.attrs["changeId"]), A.yellow));
    if (span.attrs["totalFindings"] !== undefined)
      parts.push(c(`${span.attrs["totalFindings"]} findings`, A.gray));
    if (Array.isArray(span.attrs["enabled"]) && span.attrs["enabled"].length) {
      parts.push(c(`[${(span.attrs["enabled"] as string[]).join(", ")}]`, A.dim));
    }
  }

  if (span.name.startsWith("plugin:")) {
    if (span.attrs["findings"] !== undefined)
      parts.push(c(`${span.attrs["findings"]} findings`, A.gray));
    if (span.attrs["filesAnalyzed"] !== undefined)
      parts.push(c(`${span.attrs["filesAnalyzed"]} files`, A.dim));
  }

  return parts.length ? `  ${parts.join("  ")}` : "";
}

function printSpan(
  span: Span,
  tree: Map<string | undefined, Span[]>,
  prefix: string,
  isLast: boolean,
): void {
  const dur = span.endMs !== undefined ? span.endMs - span.startMs : null;
  const durStr = dur !== null ? c(` ${formatDuration(dur)}`, A.dim) : "";

  const statusIcon = span.status === "error" ? c("✗", A.red, A.bold) : c("✓", A.green, A.dim);

  const connector = prefix ? (isLast ? "└─ " : "├─ ") : "▶ ";
  const namePart = c(span.name, A.bold, A.blue);
  const inlineAttrs = formatInlineAttrs(span);
  const errorPart = span.errorMessage
    ? `\n${prefix}${isLast ? "   " : "│  "}  ${c(span.errorMessage, A.red)}`
    : "";

  process.stderr.write(
    `${prefix}${connector}${statusIcon} ${namePart}${inlineAttrs}${durStr}${errorPart}\n`,
  );

  const children = tree.get(span.id) ?? [];
  const childPrefix = prefix + (isLast ? "   " : "│  ");
  children.forEach((child, i) => {
    printSpan(child, tree, childPrefix, i === children.length - 1);
  });
}

export function printConsoleTrace(spans: Span[]): void {
  if (spans.length === 0) return;

  const tree = buildTree(spans);
  const roots = tree.get(undefined) ?? [];

  const totalMs =
    roots.length > 0 && roots[0] !== undefined
      ? (roots[0].endMs ?? performance.now()) - roots[0].startMs
      : 0;

  process.stderr.write(`\n${c("── direc trace ──────────────────────────", A.dim)}\n`);

  roots.forEach((root, i) => {
    printSpan(root, tree, "", i === roots.length - 1);
  });

  if (totalMs > 0) {
    process.stderr.write(`${c(`total: ${formatDuration(totalMs)}`, A.dim)}\n`);
  }

  process.stderr.write(`${c("─────────────────────────────────────────", A.dim)}\n\n`);
}
