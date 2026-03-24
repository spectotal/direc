import { extname, relative } from "node:path";

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

export function resolveJsSourcePaths(
  repositoryRoot: string,
  pathScopeMode: "fallback" | "strict" | undefined,
  eventPaths: string[],
  detectedFacets: Array<{ id: string; metadata: Record<string, unknown> }>,
): string[] {
  const scopedPaths = eventPaths
    .map((path) => relative(repositoryRoot, path))
    .filter((path) => SOURCE_EXTENSIONS.has(extname(path)));

  if (scopedPaths.length > 0) {
    return [...new Set(scopedPaths)].sort();
  }

  if (pathScopeMode === "strict") {
    return [];
  }

  const jsFacet = detectedFacets.find((facet) => facet.id === "js");
  const sourcePaths = Array.isArray(jsFacet?.metadata.sourcePaths)
    ? (jsFacet.metadata.sourcePaths as string[])
    : [];

  return [...new Set(sourcePaths.filter((path) => SOURCE_EXTENSIONS.has(extname(path))))].sort();
}
