import { resolve } from "node:path";
import type {
  AnalyzerFinding,
  AnalyzerPlugin,
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
} from "direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, filterPathsWithPatterns } from "direc-analysis-runtime";
import {
  defaultPrerequisiteCheck,
  normalizeRunnerResult,
  runComplexityTool,
  type ComplexityMetric,
  type ComplexityRunner,
} from "./runner.js";
import { resolveJsSourcePaths } from "./source-paths.js";

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
        id: "typhonjs-escomplex",
        description: "JavaScript and TypeScript complexity analysis engine",
        check: factoryOptions.prerequisiteCheck ?? defaultPrerequisiteCheck,
      },
    ],
    createDefaultOptions() {
      return {
        warningThreshold: 20,
        errorThreshold: 35,
        regressionDelta: 5,
        excludePaths: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
      };
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
      const { metrics, skippedFiles } = runnerResult;
      const previousMetrics = new Map<string, ComplexityMetric>(
        (
          ((context.previousSnapshot?.metadata?.files as ComplexityMetric[] | undefined) ??
            []) as ComplexityMetric[]
        ).map((metric) => [metric.path, metric]),
      );
      const findings = metrics.flatMap((metric) => {
        const fileFindings: AnalyzerFinding[] = [];
        const warningThreshold =
          context.options.warningThreshold ?? context.options.threshold ?? 20;
        const errorThreshold =
          context.options.errorThreshold ?? Math.max(warningThreshold + 10, 35);
        const regressionDelta = context.options.regressionDelta ?? 5;

        if (metric.cyclomatic > warningThreshold) {
          const severity = metric.cyclomatic >= errorThreshold ? "error" : "warning";
          fileFindings.push({
            fingerprint: `${metric.path}:complexity-threshold`,
            analyzerId: "js-complexity",
            facetId: "js",
            severity,
            category: "complexity-threshold",
            message: `${metric.path} exceeds the configured cyclomatic threshold.`,
            scope: {
              kind: "file" as const,
              path: resolve(context.repositoryRoot, metric.path),
            },
            metrics: {
              cyclomatic: metric.cyclomatic,
              warningThreshold,
              errorThreshold,
              logicalSloc: metric.logicalSloc,
              maintainability: metric.maintainability,
            },
          });
        }

        const previousMetric = previousMetrics.get(metric.path);
        if (previousMetric && metric.cyclomatic - previousMetric.cyclomatic >= regressionDelta) {
          const severity = metric.cyclomatic >= errorThreshold ? "error" : "warning";
          fileFindings.push({
            fingerprint: `${metric.path}:complexity-regression`,
            analyzerId: "js-complexity",
            facetId: "js",
            severity,
            category: "complexity-regression",
            message: `${metric.path} regressed in cyclomatic complexity.`,
            scope: {
              kind: "file" as const,
              path: resolve(context.repositoryRoot, metric.path),
            },
            metrics: {
              cyclomatic: metric.cyclomatic,
              previousCyclomatic: previousMetric.cyclomatic,
            },
          });
        }

        return fileFindings;
      });

      findings.push(
        ...skippedFiles.map((fileError) => ({
          fingerprint: `${fileError.path}:complexity-analysis-skipped`,
          analyzerId: "js-complexity",
          facetId: "js",
          severity: "warning" as const,
          category: "complexity-analysis-skipped",
          message: `${fileError.path} could not be analyzed for complexity.`,
          scope: {
            kind: "file" as const,
            path: resolve(context.repositoryRoot, fileError.path),
          },
          details: {
            errorMessage: fileError.message,
          },
        })),
      );

      return {
        analyzerId: "js-complexity",
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings,
        metrics: {
          filesAnalyzed: metrics.length,
          skippedFileCount: skippedFiles.length,
          maxCyclomatic: metrics.reduce((max, metric) => Math.max(max, metric.cyclomatic), 0),
          excludedPathCount: candidateSourcePaths.length - sourcePaths.length,
        },
        metadata: {
          files: metrics,
          excludePaths,
          skippedFiles,
        },
      };
    },
  };
}
