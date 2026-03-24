import { extname, relative } from "node:path";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS } from "direc-analysis-runtime";

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

export function createDefaultPluginOptions(): {
  warningThreshold: number;
  errorThreshold: number;
  regressionDelta: number;
  excludePaths: string[];
} {
  return {
    warningThreshold: 20,
    errorThreshold: 35,
    regressionDelta: 5,
    excludePaths: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
  };
}

export function normalizeRunnerResult(
  result:
    | Array<{
        path: string;
        cyclomatic: number;
        logicalSloc: number;
        maintainability: number;
      }>
    | {
        metrics: Array<{
          path: string;
          cyclomatic: number;
          logicalSloc: number;
          maintainability: number;
        }>;
        skippedFiles: Array<{
          path: string;
          message: string;
        }>;
      },
): {
  metrics: Array<{
    path: string;
    cyclomatic: number;
    logicalSloc: number;
    maintainability: number;
  }>;
  skippedFiles: Array<{
    path: string;
    message: string;
  }>;
} {
  if (Array.isArray(result)) {
    return {
      metrics: result,
      skippedFiles: [],
    };
  }

  return {
    metrics: result.metrics,
    skippedFiles: result.skippedFiles,
  };
}

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
