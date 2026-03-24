import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnalyzerPrerequisiteResult } from "direc-analysis-runtime";

export type ComplexityMetric = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

type ComplexityAnalysisError = {
  path: string;
  message: string;
};

export type ComplexityRunnerResult = {
  metrics: ComplexityMetric[];
  skippedFiles: ComplexityAnalysisError[];
};

export type ComplexityRunner = (options: {
  repositoryRoot: string;
  sourcePaths: string[];
}) => Promise<ComplexityMetric[] | ComplexityRunnerResult>;

export function normalizeRunnerResult(
  result: ComplexityMetric[] | ComplexityRunnerResult,
): ComplexityRunnerResult {
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

export async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
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

export async function runComplexityTool(options: {
  repositoryRoot: string;
  sourcePaths: string[];
}): Promise<ComplexityRunnerResult> {
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
  const skippedFiles: ComplexityAnalysisError[] = [];

  for (const sourcePath of options.sourcePaths) {
    try {
      const absolutePath = resolve(options.repositoryRoot, sourcePath);
      const source = await readFile(absolutePath, "utf8");
      const report = escomplex.analyzeModule(source);

      metrics.push({
        path: sourcePath,
        cyclomatic: report.aggregate?.cyclomatic ?? 0,
        logicalSloc: report.aggregate?.sloc?.logical ?? 0,
        maintainability: report.maintainability ?? 0,
      });
    } catch (error) {
      skippedFiles.push({
        path: sourcePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    metrics,
    skippedFiles,
  };
}
