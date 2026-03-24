import type { Span } from "../tracer.js";
import {
  buildTree,
  CONSOLE_ANSI as A,
  formatConsoleText as c,
  formatDuration,
  formatInlineAttrs,
} from "./console-format.js";

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
