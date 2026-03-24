import { resolve } from "node:path";
import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";

type ComplexityMetricRecord = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

type SkippedFileRecord = {
  path: string;
  message: string;
};

export function createComplexityFindings(options: {
  repositoryRoot: string;
  metrics: ComplexityMetricRecord[];
  skippedFiles: SkippedFileRecord[];
  previousMetrics: Map<string, ComplexityMetricRecord>;
  warningThreshold: number;
  errorThreshold: number;
  regressionDelta: number;
}): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  for (const metric of options.metrics) {
    findings.push(
      ...createMetricFindings({
        repositoryRoot: options.repositoryRoot,
        metric,
        previousMetric: options.previousMetrics.get(metric.path),
        warningThreshold: options.warningThreshold,
        errorThreshold: options.errorThreshold,
        regressionDelta: options.regressionDelta,
      }),
    );
  }

  for (const skippedFile of options.skippedFiles) {
    findings.push(createSkippedFileFinding(options.repositoryRoot, skippedFile));
  }

  return findings;
}

function createMetricFindings(options: {
  repositoryRoot: string;
  metric: ComplexityMetricRecord;
  previousMetric: ComplexityMetricRecord | undefined;
  warningThreshold: number;
  errorThreshold: number;
  regressionDelta: number;
}): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const severity = resolveSeverity(options.metric.cyclomatic, options.errorThreshold);

  if (options.metric.cyclomatic > options.warningThreshold) {
    findings.push(
      createThresholdFinding(options.repositoryRoot, options.metric, severity, options),
    );
  }

  if (
    options.previousMetric &&
    options.metric.cyclomatic - options.previousMetric.cyclomatic >= options.regressionDelta
  ) {
    findings.push(
      createRegressionFinding(
        options.repositoryRoot,
        options.metric,
        options.previousMetric,
        severity,
      ),
    );
  }

  return findings;
}

function createThresholdFinding(
  repositoryRoot: string,
  metric: ComplexityMetricRecord,
  severity: "warning" | "error",
  thresholds: {
    warningThreshold: number;
    errorThreshold: number;
  },
): AnalyzerFinding {
  return {
    fingerprint: `${metric.path}:complexity-threshold`,
    analyzerId: "js-complexity",
    facetId: "js",
    severity,
    category: "complexity-threshold",
    message: `${metric.path} exceeds the configured cyclomatic threshold.`,
    scope: {
      kind: "file" as const,
      path: resolve(repositoryRoot, metric.path),
    },
    metrics: {
      cyclomatic: metric.cyclomatic,
      warningThreshold: thresholds.warningThreshold,
      errorThreshold: thresholds.errorThreshold,
      logicalSloc: metric.logicalSloc,
      maintainability: metric.maintainability,
    },
  };
}

function createRegressionFinding(
  repositoryRoot: string,
  metric: ComplexityMetricRecord,
  previousMetric: ComplexityMetricRecord,
  severity: "warning" | "error",
): AnalyzerFinding {
  return {
    fingerprint: `${metric.path}:complexity-regression`,
    analyzerId: "js-complexity",
    facetId: "js",
    severity,
    category: "complexity-regression",
    message: `${metric.path} regressed in cyclomatic complexity.`,
    scope: {
      kind: "file" as const,
      path: resolve(repositoryRoot, metric.path),
    },
    metrics: {
      cyclomatic: metric.cyclomatic,
      previousCyclomatic: previousMetric.cyclomatic,
    },
  };
}

function createSkippedFileFinding(
  repositoryRoot: string,
  skippedFile: SkippedFileRecord,
): AnalyzerFinding {
  return {
    fingerprint: `${skippedFile.path}:complexity-analysis-skipped`,
    analyzerId: "js-complexity",
    facetId: "js",
    severity: "warning" as const,
    category: "complexity-analysis-skipped",
    message: `${skippedFile.path} could not be analyzed for complexity.`,
    scope: {
      kind: "file" as const,
      path: resolve(repositoryRoot, skippedFile.path),
    },
    details: {
      errorMessage: skippedFile.message,
    },
  };
}

function resolveSeverity(cyclomatic: number, errorThreshold: number): "warning" | "error" {
  if (cyclomatic >= errorThreshold) {
    return "error";
  }

  return "warning";
}
