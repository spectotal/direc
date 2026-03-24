import type { TSESTree } from "@typescript-eslint/typescript-estree";

export function shouldSkipChild(node: TSESTree.Node, key: string): boolean {
  if (node.type === "ExportDefaultDeclaration") {
    return key !== "declaration";
  }

  if (node.type === "ExportNamedDeclaration") {
    return node.declaration ? key !== "declaration" : true;
  }

  if (node.type === "TSExportAssignment") {
    return key !== "expression";
  }

  return false;
}
