import { extname, relative } from "node:path";
import {
  collectScopedPaths,
  normalisePaths,
  type ArtifactEnvelope,
} from "@spectotal/direc-artifact-contracts";
import { DEFAULT_JS_COMPLEXITY_EXCLUDE_PATTERNS } from "./path-patterns.js";

const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);

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

export function normalizeExcludePaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_JS_COMPLEXITY_EXCLUDE_PATTERNS];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export function isJsPath(path: string): boolean {
  return JS_EXTENSIONS.has(extname(path));
}

export function toRelativePath(repositoryRoot: string, path: string): string {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}
