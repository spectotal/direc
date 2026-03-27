import type { TSESTree } from "@typescript-eslint/typescript-estree";
import {
  incrementCyclomatic,
  incrementLogicalSloc,
  recordOperator,
  type MetricAccumulator,
} from "./accumulator.js";
import type { TraversalContext } from "../ast/traversal-context.js";

export function applyFunctionMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  if (node.type === "ArrowFunctionExpression") {
    if (parent && parent.type !== "ExpressionStatement") {
      accumulator.methodCount += 1;
      incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
      recordOperator(accumulator, "function=>");

      if (node.body.type !== "BlockStatement") {
        incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
      }
    }

    return true;
  }

  if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
    accumulator.methodCount += 1;
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);

    if (parent?.type === "MethodDefinition") {
      if (node.generator) {
        recordOperator(accumulator, "function*");
      }
    } else {
      recordOperator(accumulator, node.generator ? "function*" : "function");
    }

    return true;
  }

  return false;
}
