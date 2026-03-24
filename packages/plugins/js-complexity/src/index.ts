import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import type {
  AnalyzerFinding,
  AnalyzerPlugin,
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
} from "direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, filterPathsWithPatterns } from "direc-analysis-runtime";

const SOURCE_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);

type ComplexityMetric = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

type ComplexityRunner = (options: {
  repositoryRoot: string;
  sourcePaths: string[];
}) => Promise<ComplexityMetric[]>;

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
        context.event.pathScopes ?? [],
        context.detectedFacets,
      );
      const sourcePaths = filterPathsWithPatterns(candidateSourcePaths, excludePaths);

      const runner = factoryOptions.runner ?? runComplexityTool;
      const metrics = await runner({
        repositoryRoot: context.repositoryRoot,
        sourcePaths,
      });

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

      return {
        analyzerId: "js-complexity",
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings,
        metrics: {
          filesAnalyzed: metrics.length,
          maxCyclomatic: metrics.reduce((max, metric) => Math.max(max, metric.cyclomatic), 0),
          excludedPathCount: candidateSourcePaths.length - sourcePaths.length,
        },
        metadata: {
          files: metrics,
          excludePaths,
        },
      };
    },
  };
}

async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
  try {
    await import("typhonjs-escomplex");
    return {
      ok: true,
      summary: "typhonjs-escomplex is available.",
    };
  } catch (error) {
    return {
      ok: false,
      summary: "typhonjs-escomplex is not available.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runComplexityTool(options: {
  repositoryRoot: string;
  sourcePaths: string[];
}): Promise<ComplexityMetric[]> {
  const { default: escomplex } = (await import("typhonjs-escomplex")) as {
    default: {
      analyzeModule: (source: string) => {
        aggregate?: {
          cyclomatic?: number;
          sloc?: {
            logical?: number;
          };
        };
        maintainability?: number;
      };
    };
  };

  const metrics: ComplexityMetric[] = [];

  for (const sourcePath of options.sourcePaths) {
    const absolutePath = resolve(options.repositoryRoot, sourcePath);
    const source = await readFile(absolutePath, "utf8");
    const report = escomplex.analyzeModule(source);

    metrics.push({
      path: sourcePath,
      cyclomatic: report.aggregate?.cyclomatic ?? 0,
      logicalSloc: report.aggregate?.sloc?.logical ?? 0,
      maintainability: report.maintainability ?? 0,
    });
  }

  return metrics;
}

function resolveJsSourcePaths(
  repositoryRoot: string,
  eventPaths: string[],
  detectedFacets: Array<{ id: string; metadata: Record<string, unknown> }>,
): string[] {
  const scopedPaths = eventPaths
    .map((path) => relative(repositoryRoot, path))
    .filter((path) => SOURCE_EXTENSIONS.has(extname(path)));

  if (scopedPaths.length > 0) {
    return [...new Set(scopedPaths)].sort();
  }

  const jsFacet = detectedFacets.find((facet) => facet.id === "js");
  const sourcePaths = Array.isArray(jsFacet?.metadata.sourcePaths)
    ? (jsFacet.metadata.sourcePaths as string[])
    : [];

  return [...new Set(sourcePaths.filter((path) => SOURCE_EXTENSIONS.has(extname(path))))].sort();
}
