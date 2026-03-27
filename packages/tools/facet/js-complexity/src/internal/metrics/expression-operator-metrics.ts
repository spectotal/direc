import type { TSESTree } from "@typescript-eslint/typescript-estree";
import {
  incrementCyclomatic,
  incrementLogicalSloc,
  recordOperator,
  recordOperatorCount,
  type MetricAccumulator,
} from "./accumulator.js";
import { applyInvocationExpressionMetrics } from "./invocation-expression-metrics.js";
import type { TraversalContext } from "../ast/traversal-context.js";

const ARRAY_TYPES = new Set(["ArrayExpression", "ArrayPattern"]);
const LOGICAL_OPERATORS = new Set(["&&", "||", "??"]);

export function applyExpressionOperatorMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  if (applyInvocationExpressionMetrics(node, parent, accumulator, context)) {
    return true;
  }

  if (ARRAY_TYPES.has(node.type)) {
    const arrayNode = node as TSESTree.ArrayExpression | TSESTree.ArrayPattern;
    recordOperator(accumulator, "[]");
    recordOperatorCount(accumulator, ",", Math.max(arrayNode.elements.length - 1, 0));
    return true;
  }

  if (node.type === "AssignmentExpression") {
    if (parent?.type !== "ExpressionStatement") {
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    }

    recordOperator(accumulator, node.operator);
    return true;
  }

  if (node.type === "AssignmentPattern") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "=");
    return true;
  }

  if (node.type === "AwaitExpression") {
    recordOperator(accumulator, "await");
    return true;
  }

  if (node.type === "BinaryExpression") {
    recordOperator(accumulator, node.operator);
    return true;
  }

  if (node.type === "ConditionalExpression") {
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    recordOperator(accumulator, ":?");
    return true;
  }

  if (node.type === "LogicalExpression") {
    if (LOGICAL_OPERATORS.has(node.operator)) {
      incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    }

    recordOperator(accumulator, node.operator);
    return true;
  }

  if (node.type === "MemberExpression") {
    recordOperator(accumulator, node.computed ? "[]" : ".");
    return true;
  }

  if (node.type === "MetaProperty") {
    recordOperator(accumulator, ".");
    return true;
  }

  return false;
}
