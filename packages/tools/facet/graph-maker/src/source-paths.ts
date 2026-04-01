import { extname } from "node:path";
import {
  collectScopedPaths,
  normalisePaths,
  type ArtifactEnvelope,
} from "@spectotal/direc-artifact-contracts";

const JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export function resolveJsSourcePaths(
  inputArtifacts: ArtifactEnvelope[],
  fallbackSourcePaths: string[],
): string[] {
  const scopedPaths = collectScopedPaths(inputArtifacts).filter(isJsPath);
  const hasExplicitPathScope = inputArtifacts.some(
    (artifact) => artifact.scope.paths !== undefined,
  );

  return hasExplicitPathScope
    ? normalisePaths(scopedPaths)
    : normalisePaths(fallbackSourcePaths.filter(isJsPath));
}

export function isJsPath(path: string): boolean {
  return JS_EXTENSIONS.includes(extname(path));
}

export function graphJsExtensions(): string[] {
  return [...JS_EXTENSIONS];
}
