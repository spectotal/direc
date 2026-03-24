import type { TSESTree } from "@typescript-eslint/typescript-estree";
import {
  incrementCyclomatic,
  incrementLogicalSloc,
  recordOperator,
  type MetricAccumulator,
} from "./accumulator.js";
import type { TraversalContext } from "../ast/traversal-context.js";

const SIMPLE_STATEMENT_OPERATORS = new Map<string, string>([
  ["BreakStatement", "break"],
  ["ContinueStatement", "continue"],
  ["ReturnStatement", "return"],
  ["ThrowStatement", "throw"],
  ["WithStatement", "with"],
]);
const LOOP_OPERATORS = new Map<string, string>([
  ["ForInStatement", "forin"],
  ["ForOfStatement", "forof"],
  ["ForStatement", "for"],
  ["WhileStatement", "while"],
]);

export function applyStatementMetrics(
  node: TSESTree.Node,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  const simpleStatementOperator = SIMPLE_STATEMENT_OPERATORS.get(node.type);

  if (simpleStatementOperator) {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, simpleStatementOperator);
    return true;
  }

  const loopOperator = LOOP_OPERATORS.get(node.type);

  if (loopOperator) {
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, loopOperator);
    return true;
  }

  if (node.type === "DoWhileStatement") {
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 2);
    recordOperator(accumulator, "dowhile");
    return true;
  }

  if (node.type === "ExpressionStatement") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    return true;
  }

  if (node.type === "IfStatement") {
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, node.alternate ? 2 : 1);
    recordOperator(accumulator, "if");

    if (node.alternate) {
      recordOperator(accumulator, "else");
    }

    return true;
  }

  if (node.type === "CatchClause") {
    incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "catch");
    return true;
  }

  if (node.type === "SwitchCase") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, node.test ? "case" : "default");

    if (node.test) {
      incrementCyclomatic(accumulator, context.allowCyclomatic, 1);
    }

    return true;
  }

  if (node.type === "SwitchStatement") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "switch");
    return true;
  }

  if (node.type === "TryStatement") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "try");

    if (node.finalizer) {
      recordOperator(accumulator, "finally");
    }

    return true;
  }

  return false;
}
