import type { TSESTree } from "@typescript-eslint/typescript-estree";
import {
  incrementLogicalSloc,
  recordOperand,
  recordOperator,
  recordOperatorCount,
  type MetricAccumulator,
} from "./accumulator.js";
import type { TraversalContext } from "../ast/traversal-context.js";

const OBJECT_TYPES = new Set(["ObjectExpression", "ObjectPattern"]);
const UNARY_OPERATOR_TYPES = new Set(["UnaryExpression", "UpdateExpression"]);
const SIMPLE_OPERATORS = new Map<string, string>([
  ["RestElement", "... (rest)"],
  ["SpreadElement", "... (spread)"],
  ["Super", "super"],
  ["ThisExpression", "this"],
]);

export function applyLiteralMetrics(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): void {
  const simpleOperator = SIMPLE_OPERATORS.get(node.type);

  if (simpleOperator) {
    recordOperator(accumulator, simpleOperator);
    return;
  }

  if (OBJECT_TYPES.has(node.type)) {
    recordOperator(accumulator, "{}");
    return;
  }

  if (node.type === "Identifier") {
    recordOperand(accumulator, node.name);
    return;
  }

  if (node.type === "PrivateIdentifier") {
    recordOperand(accumulator, `#${node.name}`);
    return;
  }

  if (node.type === "TaggedTemplateExpression") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    return;
  }

  if (node.type === "TemplateElement") {
    if (node.value.cooked) {
      recordOperand(accumulator, node.value.cooked);
    }

    return;
  }

  if (node.type === "TemplateLiteral") {
    recordOperator(accumulator, "``");
    recordOperatorCount(accumulator, "${}", node.expressions.length);
    return;
  }

  if (node.type === "Literal") {
    recordOperand(accumulator, normalizeLiteral(node));
    return;
  }

  if (UNARY_OPERATOR_TYPES.has(node.type)) {
    const operatorNode = node as TSESTree.UnaryExpression | TSESTree.UpdateExpression;
    recordOperator(
      accumulator,
      `${operatorNode.operator} (${operatorNode.prefix ? "pre" : "post"}fix)`,
    );
    return;
  }

  if (node.type === "YieldExpression") {
    if (parent?.type !== "ExpressionStatement") {
      incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    }

    recordOperator(accumulator, node.delegate ? "yield*" : "yield");
  }
}

function normalizeLiteral(node: TSESTree.Literal): string {
  const literal = node as unknown as {
    raw?: string;
    value?: unknown;
  };

  if (typeof literal.raw === "string") {
    return literal.raw;
  }

  if (typeof literal.value === "string") {
    return JSON.stringify(literal.value);
  }

  return String(literal.value);
}
