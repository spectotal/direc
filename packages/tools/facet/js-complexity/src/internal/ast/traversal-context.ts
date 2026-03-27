import type { TSESTree } from "@typescript-eslint/typescript-estree";

export type TraversalContext = {
  allowCyclomatic: boolean;
  allowLogicalSloc: boolean;
};

export const DEFAULT_TRAVERSAL_CONTEXT: TraversalContext = {
  allowCyclomatic: true,
  allowLogicalSloc: true,
};

export function suppressStructuralMetrics(context: TraversalContext): TraversalContext {
  return {
    ...context,
    allowCyclomatic: false,
    allowLogicalSloc: false,
  };
}

export function isDeclareOnlyNode(node: TSESTree.Node): boolean {
  if ("declare" in node && node.declare === true) {
    return true;
  }

  if (
    (node.type === "MethodDefinition" || node.type === "PropertyDefinition") &&
    "abstract" in node &&
    node.abstract === true
  ) {
    return true;
  }

  return false;
}

export function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

export function isNoOpArrowFunction(
  node: TSESTree.Node,
  parent: TSESTree.Node | null,
): node is TSESTree.ArrowFunctionExpression {
  return node.type === "ArrowFunctionExpression" && parent?.type === "ExpressionStatement";
}
