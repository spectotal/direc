export function createSnapshotMetrics(options: {
  candidateSourceCount: number;
  sourcePathCount: number;
  metrics: Array<{
    cyclomatic: number;
  }>;
  skippedFiles: Array<unknown>;
}): {
  filesAnalyzed: number;
  skippedFileCount: number;
  maxCyclomatic: number;
  excludedPathCount: number;
} {
  return {
    filesAnalyzed: options.metrics.length,
    skippedFileCount: options.skippedFiles.length,
    maxCyclomatic: resolveMaxCyclomatic(options.metrics),
    excludedPathCount: options.candidateSourceCount - options.sourcePathCount,
  };
}

export function createPreviousMetricsMap(
  previousFiles:
    | Array<{
        path: string;
        cyclomatic: number;
        logicalSloc: number;
        maintainability: number;
      }>
    | undefined,
): Map<
  string,
  {
    path: string;
    cyclomatic: number;
    logicalSloc: number;
    maintainability: number;
  }
> {
  return new Map((previousFiles ?? []).map((metric) => [metric.path, metric]));
}

function resolveMaxCyclomatic(metrics: Array<{ cyclomatic: number }>): number {
  let maxCyclomatic = 0;

  for (const metric of metrics) {
    maxCyclomatic = Math.max(maxCyclomatic, metric.cyclomatic);
  }

  return maxCyclomatic;
}
