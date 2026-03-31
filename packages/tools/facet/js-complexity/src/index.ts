import { extname, relative, resolve } from "node:path";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import {
  collectScopedPaths,
  normalisePaths,
  type ArtifactEnvelope,
} from "@spectotal/direc-artifact-contracts";
import type {
  ComplexityArtifactPayload,
  ComplexityFileMetric,
  ComplexitySkippedFile,
} from "./contracts.js";
import { runComplexityTool, type ComplexityMetric, type ComplexityRunnerResult } from "./engine.js";
import {
  DEFAULT_JS_COMPLEXITY_EXCLUDE_PATTERNS,
  filterPathsWithPatterns,
} from "./path-patterns.js";

export {
  analyzeSource,
  defaultPrerequisiteCheck,
  parseSource,
  runComplexityTool,
  type ComplexityAnalysisError,
  type ComplexityMetric,
  type ComplexityRunnerResult,
  type PrerequisiteCheckResult,
} from "./engine.js";
export type {
  ComplexityArtifactPayload,
  ComplexityFileMetric,
  ComplexitySkippedFile,
} from "./contracts.js";

const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);

type ComplexityRunner = (options: {
  repositoryRoot: string;
  sourcePaths: string[];
}) => Promise<ComplexityMetric[] | ComplexityRunnerResult>;

export function createJsComplexityNode(
  factoryOptions: {
    runner?: ComplexityRunner;
  } = {},
): AnalysisNode<{
  warningThreshold?: number;
  errorThreshold?: number;
  excludePaths?: string[];
}> {
  return {
    id: "js-complexity",
    displayName: "JS Complexity",
    binding: "facet",
    requires: {
      anyOf: ["source.diff.scope", "source.openspec.task", "source.repository.scope"],
    },
    requiredFacets: ["js"],
    produces: ["metric.complexity"],
    detect(context) {
      return context.facets.some((facet) => facet.id === "js");
    },
    async run(context) {
      const candidateSourcePaths = resolveJsSourcePaths(
        context.inputArtifacts,
        context.projectContext.sourceFiles.filter(isJsPath),
      );
      const excludePaths = normalizeExcludePaths(context.options.excludePaths);
      const relativeSourcePaths = filterPathsWithPatterns(
        candidateSourcePaths.map((path) => toRelativePath(context.repositoryRoot, path)),
        excludePaths,
      );
      const runner = factoryOptions.runner ?? runComplexityTool;
      const runnerResult = normalizeRunnerResult(
        await runner({
          repositoryRoot: context.repositoryRoot,
          sourcePaths: relativeSourcePaths,
        }),
      );
      const warningThreshold = asNumber(context.options.warningThreshold, 20);
      const errorThreshold = asNumber(
        context.options.errorThreshold,
        Math.max(warningThreshold + 10, 35),
      );
      const files: ComplexityFileMetric[] = runnerResult.metrics.map((metric) => ({
        ...metric,
        path: resolve(context.repositoryRoot, metric.path),
      }));
      const skippedFiles: ComplexitySkippedFile[] = runnerResult.skippedFiles.map((file) => ({
        ...file,
        path: resolve(context.repositoryRoot, file.path),
      }));
      let thresholdWarningCount = 0;
      let thresholdErrorCount = 0;

      for (const file of files) {
        if (file.cyclomatic >= errorThreshold) {
          thresholdErrorCount += 1;
        } else if (file.cyclomatic >= warningThreshold) {
          thresholdWarningCount += 1;
        }
      }

      return [
        {
          type: "metric.complexity",
          scope: {
            kind: "paths",
            paths: relativeSourcePaths.map((path) => resolve(context.repositoryRoot, path)),
          },
          payload: {
            paths: relativeSourcePaths.map((path) => resolve(context.repositoryRoot, path)),
            files,
            skippedFiles,
            warningThreshold,
            errorThreshold,
            warningCount: thresholdWarningCount + skippedFiles.length,
            errorCount: thresholdErrorCount,
            thresholdWarningCount,
            thresholdErrorCount,
            skippedFileCount: skippedFiles.length,
            maxCyclomatic: files.reduce((max, entry) => Math.max(max, entry.cyclomatic), 0),
          } satisfies ComplexityArtifactPayload,
        },
      ];
    },
  };
}

export const jsComplexityNode = createJsComplexityNode();

function normalizeRunnerResult(
  result: ComplexityMetric[] | ComplexityRunnerResult,
): ComplexityRunnerResult {
  if (Array.isArray(result)) {
    return {
      metrics: result,
      skippedFiles: [],
    };
  }

  return result;
}

function resolveJsSourcePaths(
  inputArtifacts: ArtifactEnvelope[],
  fallbackSourcePaths: string[],
): string[] {
  const scopedPaths = collectScopedPaths(inputArtifacts).filter(isJsPath);
  const hasExplicitPathScope = inputArtifacts.some(
    (artifact) => artifact.scope.paths !== undefined,
  );

  if (hasExplicitPathScope) {
    return normalisePaths(scopedPaths);
  }

  return normalisePaths(fallbackSourcePaths.filter(isJsPath));
}

function normalizeExcludePaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_JS_COMPLEXITY_EXCLUDE_PATTERNS];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function isJsPath(path: string): boolean {
  return JS_EXTENSIONS.has(extname(path));
}

function toRelativePath(repositoryRoot: string, path: string): string {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}
