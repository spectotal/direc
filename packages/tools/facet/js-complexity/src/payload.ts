import { resolve } from "node:path";
import type {
  ComplexityArtifactPayload,
  ComplexityFileMetric,
  ComplexitySkippedFile,
} from "./contracts.js";
import type { ComplexityMetric, ComplexityRunnerResult } from "./engine.js";

export function normalizeRunnerResult(
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

export function createComplexityPayload(options: {
  repositoryRoot: string;
  relativeSourcePaths: string[];
  runnerResult: ComplexityRunnerResult;
  warningThreshold: number;
  errorThreshold: number;
}): ComplexityArtifactPayload {
  const files: ComplexityFileMetric[] = options.runnerResult.metrics.map((metric) => ({
    ...metric,
    path: resolve(options.repositoryRoot, metric.path),
  }));
  const skippedFiles: ComplexitySkippedFile[] = options.runnerResult.skippedFiles.map((file) => ({
    ...file,
    path: resolve(options.repositoryRoot, file.path),
  }));
  const { thresholdWarningCount, thresholdErrorCount } = countThresholdFindings(
    files,
    options.warningThreshold,
    options.errorThreshold,
  );

  return {
    paths: options.relativeSourcePaths.map((path) => resolve(options.repositoryRoot, path)),
    files,
    skippedFiles,
    warningThreshold: options.warningThreshold,
    errorThreshold: options.errorThreshold,
    warningCount: thresholdWarningCount + skippedFiles.length,
    errorCount: thresholdErrorCount,
    thresholdWarningCount,
    thresholdErrorCount,
    skippedFileCount: skippedFiles.length,
    maxCyclomatic: files.reduce((max, entry) => Math.max(max, entry.cyclomatic), 0),
  };
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function countThresholdFindings(
  files: ComplexityFileMetric[],
  warningThreshold: number,
  errorThreshold: number,
): {
  thresholdWarningCount: number;
  thresholdErrorCount: number;
} {
  let thresholdWarningCount = 0;
  let thresholdErrorCount = 0;

  for (const file of files) {
    if (file.cyclomatic >= errorThreshold) {
      thresholdErrorCount += 1;
    } else if (file.cyclomatic >= warningThreshold) {
      thresholdWarningCount += 1;
    }
  }

  return {
    thresholdWarningCount,
    thresholdErrorCount,
  };
}
