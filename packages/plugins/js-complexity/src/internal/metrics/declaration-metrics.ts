import type { TSESTree } from "@typescript-eslint/typescript-estree";
import type { MetricAccumulator } from "./accumulator.js";
import { applyFunctionMetrics } from "./function-metrics.js";
import { applyStructureMetrics } from "./structure-metrics.js";
import type { TraversalContext } from "../ast/traversal-context.js";

export function applyDeclarationMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  return (
    applyFunctionMetrics(node, parent, accumulator, context) ||
    applyStructureMetrics(node, accumulator, context)
  );
}
