import type {
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
  AnalyzerPlugin,
} from "@spectotal/direc-analysis-runtime";
import {
  DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  filterPathsWithPatterns,
} from "@spectotal/direc-analysis-runtime";
import {
  defaultPrerequisiteCheck,
  runComplexityTool,
  type ComplexityMetric,
  type ComplexityRunnerResult,
} from "./engine.js";
import { createComplexityFindings } from "./internal/plugin/plugin-findings.js";
import {
  createDefaultPluginOptions,
  normalizeRunnerResult,
  resolveJsSourcePaths,
} from "./internal/plugin/plugin-options.js";
import {
  createPreviousMetricsMap,
  createSnapshotMetrics,
} from "./internal/plugin/plugin-snapshot.js";

export {
  analyzeSource,
  defaultPrerequisiteCheck,
  parseSource,
  runComplexityTool,
  type ComplexityAnalysisError,
  type ComplexityMetric,
  type ComplexityRunnerResult,
} from "./engine.js";

type ComplexityRunner = (options: {
  repositoryRoot: string;
  sourcePaths: string[];
}) => Promise<ComplexityMetric[] | ComplexityRunnerResult>;

export interface ComplexityPluginOptions {
  threshold?: number;
  warningThreshold?: number;
  errorThreshold?: number;
  regressionDelta?: number;
  excludePaths?: string[];
}

type ComplexityPluginFactoryOptions = {
  prerequisiteCheck?: () => Promise<AnalyzerPrerequisiteResult>;
  runner?: ComplexityRunner;
};

export function createJsComplexityPlugin(
  factoryOptions: ComplexityPluginFactoryOptions = {},
): AnalyzerPlugin<ComplexityPluginOptions> {
  return {
    id: "js-complexity",
    displayName: "JS Complexity",
    supportedFacets: ["js"],
    prerequisites: [
      {
        id: "typescript-estree",
        description: "JavaScript and TypeScript complexity analysis engine",
        check: factoryOptions.prerequisiteCheck ?? defaultPrerequisiteCheck,
      },
    ],
    createDefaultOptions() {
      return createDefaultPluginOptions();
    },
    async run(context): Promise<AnalyzerSnapshot> {
      const excludePaths = context.options.excludePaths ?? [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS];
      const candidateSourcePaths = resolveJsSourcePaths(
        context.repositoryRoot,
        context.event.pathScopeMode,
        context.event.pathScopes ?? [],
        context.detectedFacets,
      );
      const sourcePaths = filterPathsWithPatterns(candidateSourcePaths, excludePaths);
      const runner = factoryOptions.runner ?? runComplexityTool;
      const runnerResult = normalizeRunnerResult(
        await runner({
          repositoryRoot: context.repositoryRoot,
          sourcePaths,
        }),
      );
      const previousMetrics = createPreviousMetricsMap(
        context.previousSnapshot?.metadata?.files as ComplexityMetric[] | undefined,
      );
      const warningThreshold = context.options.warningThreshold ?? context.options.threshold ?? 20;
      const errorThreshold = context.options.errorThreshold ?? Math.max(warningThreshold + 10, 35);
      const regressionDelta = context.options.regressionDelta ?? 5;

      return {
        analyzerId: "js-complexity",
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings: createComplexityFindings({
          repositoryRoot: context.repositoryRoot,
          metrics: runnerResult.metrics,
          skippedFiles: runnerResult.skippedFiles,
          previousMetrics,
          warningThreshold,
          errorThreshold,
          regressionDelta,
        }),
        metrics: createSnapshotMetrics({
          candidateSourceCount: candidateSourcePaths.length,
          sourcePathCount: sourcePaths.length,
          metrics: runnerResult.metrics,
          skippedFiles: runnerResult.skippedFiles,
        }),
        metadata: {
          files: runnerResult.metrics,
          excludePaths,
          skippedFiles: runnerResult.skippedFiles,
        },
      };
    },
  };
}
