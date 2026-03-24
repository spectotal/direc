import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { incrementLogicalSloc, recordOperator, type MetricAccumulator } from "./accumulator.js";
import type { TraversalContext } from "../ast/traversal-context.js";

export function applyStructureMetrics(
  node: TSESTree.Node,
  accumulator: MetricAccumulator,
  context: TraversalContext,
): boolean {
  if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "class");

    if (node.superClass) {
      recordOperator(accumulator, "extends");
    }

    return true;
  }

  if (node.type === "MethodDefinition") {
    if (node.kind === "get" || node.kind === "set") {
      recordOperator(accumulator, node.kind);
    }

    if (node.static) {
      recordOperator(accumulator, "static");
    }

    return true;
  }

  if (node.type === "Property") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);

    if (!node.shorthand) {
      recordOperator(accumulator, ":");
    }

    return true;
  }

  if (node.type === "PropertyDefinition") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);

    if (node.static) {
      recordOperator(accumulator, "static");
    }

    if (node.value) {
      recordOperator(accumulator, "=");
    }

    return true;
  }

  if (node.type === "TSEnumDeclaration") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);
    recordOperator(accumulator, "enum");
    return true;
  }

  if (node.type === "VariableDeclaration") {
    recordOperator(accumulator, node.kind);
    return true;
  }

  if (node.type === "VariableDeclarator") {
    incrementLogicalSloc(accumulator, context.allowLogicalSloc, 1);

    if (node.init) {
      recordOperator(accumulator, "=");
    }

    return true;
  }

  return false;
}
