import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { suppressStructuralMetrics, type TraversalContext } from "./traversal-context.js";

const FUNCTION_CONTEXT_KEYS = new Set(["id", "params", "returnType", "typeParameters"]);
const CLASS_CONTEXT_KEYS = new Set([
  "id",
  "implements",
  "superClass",
  "superTypeArguments",
  "typeParameters",
]);

export function getFunctionChildContext(
  node: TSESTree.Node,
  key: string,
  context: TraversalContext,
): TraversalContext | null {
  if (
    (node.type === "ArrowFunctionExpression" ||
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression") &&
    FUNCTION_CONTEXT_KEYS.has(key)
  ) {
    return suppressStructuralMetrics(context);
  }

  if (node.type === "CatchClause" && key === "param") {
    return suppressStructuralMetrics(context);
  }

  if (
    (node.type === "ClassDeclaration" || node.type === "ClassExpression") &&
    CLASS_CONTEXT_KEYS.has(key)
  ) {
    return suppressStructuralMetrics(context);
  }

  return null;
}
