import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { isDeclareOnlyNode, isNoOpArrowFunction } from "./traversal-context.js";

const DIRECTLY_SKIPPED_TYPES = new Set([
  "ImportDeclaration",
  "ExportAllDeclaration",
  "TSImportEqualsDeclaration",
  "TSNamespaceExportDeclaration",
  "TSDeclareFunction",
]);
const RUNTIME_TS_NODE_TYPES = new Set([
  "TSAsExpression",
  "TSEnumDeclaration",
  "TSEnumMember",
  "TSExportAssignment",
  "TSInstantiationExpression",
  "TSModuleBlock",
  "TSModuleDeclaration",
  "TSNonNullExpression",
  "TSParameterProperty",
  "TSSatisfiesExpression",
]);

export function shouldSkipNode(node: TSESTree.Node, parent: TSESTree.Node | null): boolean {
  if (isDeclareOnlyNode(node) || isNoOpArrowFunction(node, parent)) {
    return true;
  }

  if (DIRECTLY_SKIPPED_TYPES.has(node.type)) {
    return true;
  }

  return node.type.startsWith("TS") && !RUNTIME_TS_NODE_TYPES.has(node.type);
}
