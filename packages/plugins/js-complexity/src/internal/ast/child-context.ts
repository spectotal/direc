import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { getFunctionChildContext } from "./function-child-context.js";
import { getStructuralChildContext } from "./structural-child-context.js";
import type { TraversalContext } from "./traversal-context.js";

export function getChildContext(
  node: TSESTree.Node,
  key: string,
  context: TraversalContext,
): TraversalContext {
  const functionContext = getFunctionChildContext(node, key, context);

  if (functionContext) {
    return functionContext;
  }

  const structuralContext = getStructuralChildContext(node, key, context);

  if (structuralContext) {
    return structuralContext;
  }

  return context;
}
