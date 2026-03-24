import { extname, relative } from "node:path";
import type { DetectedFacet } from "@spectotal/direc-analysis-runtime";

export function resolveTargetPaths(
  repositoryRoot: string,
  pathScopeMode: "fallback" | "strict" | undefined,
  eventPaths: string[],
  detectedFacets: DetectedFacet[],
): string[] {
  const scopedSourcePaths = eventPaths
    .map((path) => relative(repositoryRoot, path))
    .filter((path) => [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extname(path)));

  if (scopedSourcePaths.length > 0) {
    return [...new Set(scopedSourcePaths)].sort();
  }

  if (pathScopeMode === "strict") {
    return [];
  }

  const jsFacet = detectedFacets.find((facet) => facet.id === "js");
  const sourcePaths = Array.isArray(jsFacet?.metadata.sourcePaths)
    ? (jsFacet.metadata.sourcePaths as string[])
    : [];
  if (sourcePaths.length > 0) {
    return [...new Set(sourcePaths)].sort();
  }

  const packageBoundaries = Array.isArray(jsFacet?.metadata.packageBoundaries)
    ? (jsFacet.metadata.packageBoundaries as Array<{ root?: string }>)
    : [];
  const roots = packageBoundaries
    .map((boundary) => boundary.root)
    .filter((root): root is string => Boolean(root))
    .filter((root) => root !== ".");

  return roots.length > 0 ? [...new Set(roots)].sort() : ["."];
}

export function resolveTsConfigPath(
  detectedFacets: DetectedFacet[],
  explicitPath?: string,
): string | undefined {
  if (explicitPath) {
    return explicitPath;
  }

  const jsFacet = detectedFacets.find((facet) => facet.id === "js");
  const tsConfigPaths = Array.isArray(jsFacet?.metadata.tsconfigPaths)
    ? (jsFacet.metadata.tsconfigPaths as string[])
    : [];

  return tsConfigPaths[0];
}
