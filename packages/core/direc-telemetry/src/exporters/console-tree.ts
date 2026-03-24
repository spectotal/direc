import type { Span } from "../tracer.js";

export function buildTree(spans: Span[]): Map<string | undefined, Span[]> {
  const tree = new Map<string | undefined, Span[]>();

  for (const span of spans) {
    const siblings = tree.get(span.parentId);
    if (siblings) {
      siblings.push(span);
      continue;
    }

    tree.set(span.parentId, [span]);
  }

  return tree;
}
