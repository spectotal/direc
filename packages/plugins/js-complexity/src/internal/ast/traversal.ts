import { getKeys, visitorKeys } from "@typescript-eslint/visitor-keys";
import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { getChildContext, shouldSkipChild, shouldSkipNode } from "./skip-rules.js";
import { isNode, type TraversalContext } from "./traversal-context.js";
import type { MetricAccumulator } from "../metrics/accumulator.js";
import { applyDeclarationMetrics } from "../metrics/declaration-metrics.js";
import { applyExpressionOperatorMetrics } from "../metrics/expression-operator-metrics.js";
import { applyLiteralMetrics } from "../metrics/literal-metrics.js";
import { applyStatementMetrics } from "../metrics/statement-metrics.js";

export function traverse(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): void {
  if (shouldSkipNode(node, parent)) {
    return;
  }

  applyNodeMetrics(node, parent, accumulator, context);

  const keys = visitorKeys[node.type as keyof typeof visitorKeys] ?? getKeys(node);

  for (const key of keys) {
    if (shouldSkipChild(node, key)) {
      continue;
    }

    const childContext = getChildContext(node, key, context);
    const child = (node as unknown as Record<string, unknown>)[key];

    if (Array.isArray(child)) {
      for (const entry of child) {
        if (isNode(entry)) {
          traverse(entry, node, accumulator, childContext);
        }
      }

      continue;
    }

    if (isNode(child)) {
      traverse(child, node, accumulator, childContext);
    }
  }
}

function applyNodeMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): void {
  if (applyDeclarationMetrics(node, parent, accumulator, context)) {
    return;
  }

  if (applyStatementMetrics(node, accumulator, context)) {
    return;
  }

  if (applyExpressionOperatorMetrics(node, parent, accumulator, context)) {
    return;
  }

  applyLiteralMetrics(node, parent, accumulator, context);
}
