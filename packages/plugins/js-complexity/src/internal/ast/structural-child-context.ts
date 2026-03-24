import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { suppressStructuralMetrics, type TraversalContext } from "./traversal-context.js";

const FOR_IN_OF_CONTEXT_KEYS = new Set(["left", "right"]);
const FOR_STATEMENT_CONTEXT_KEYS = new Set(["init", "test", "update"]);

export function getStructuralChildContext(
  node: TSESTree.Node,
  key: string,
  context: TraversalContext,
): TraversalContext | null {
  if (
    (node.type === "ForInStatement" || node.type === "ForOfStatement") &&
    FOR_IN_OF_CONTEXT_KEYS.has(key)
  ) {
    return suppressStructuralMetrics(context);
  }

  if (node.type === "ForStatement" && FOR_STATEMENT_CONTEXT_KEYS.has(key)) {
    return suppressStructuralMetrics(context);
  }

  if ((node.type === "MethodDefinition" || node.type === "PropertyDefinition") && key === "key") {
    return suppressStructuralMetrics(context);
  }

  if (
    (node.type === "TSModuleDeclaration" && key === "id") ||
    (node.type === "TSParameterProperty" && key === "parameter")
  ) {
    return suppressStructuralMetrics(context);
  }

  return null;
}
