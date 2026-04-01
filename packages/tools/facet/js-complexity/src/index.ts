import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { ComplexityArtifactPayload } from "./contracts.js";
import { runComplexityTool, type ComplexityMetric, type ComplexityRunnerResult } from "./engine.js";
import { createComplexityPayload, normalizeRunnerResult, asNumber } from "./payload.js";
import { filterPathsWithPatterns } from "./path-patterns.js";
import {
  isJsPath,
  normalizeExcludePaths,
  resolveJsSourcePaths,
  toRelativePath,
} from "./source-paths.js";

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

      return [
        {
          type: "metric.complexity",
          scope: {
            kind: "paths",
            paths: createComplexityPayload({
              repositoryRoot: context.repositoryRoot,
              relativeSourcePaths,
              runnerResult,
              warningThreshold,
              errorThreshold,
            }).paths,
          },
          payload: createComplexityPayload({
            repositoryRoot: context.repositoryRoot,
            relativeSourcePaths,
            runnerResult,
            warningThreshold,
            errorThreshold,
          }) satisfies ComplexityArtifactPayload,
        },
      ];
    },
  };
}

export const jsComplexityNode = createJsComplexityNode();
