import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { incrementLogicalSloc, recordOperator, type MetricAccumulator } from "./accumulator.js";
import type { TraversalContext } from "../ast/traversal-context.js";

export function applyInvocationExpressionMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  if (node.type === "CallExpression") {
    if (parent?.type !== "ExpressionStatement" && parent?.type !== "YieldExpression") {
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    }

    recordOperator(accumulator, "()");
    return true;
  }

  if (node.type === "ImportExpression") {
    if (parent?.type !== "ExpressionStatement") {
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    }

    recordOperator(accumulator, "import()");
    return true;
  }

  if (node.type === "NewExpression") {
    recordOperator(accumulator, "new");

    if (node.callee.type === "FunctionExpression") {
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    }

    return true;
  }

  return false;
}
