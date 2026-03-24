import assert from "node:assert/strict";
import test from "node:test";
import { createComplexityFindings } from "../src/internal/plugin/plugin-findings.js";
import {
  normalizeRunnerResult,
  resolveJsSourcePaths,
} from "../src/internal/plugin/plugin-options.js";
import {
  createPreviousMetricsMap,
  createSnapshotMetrics,
} from "../src/internal/plugin/plugin-snapshot.js";

test("resolveJsSourcePaths prefers event-scoped JS files", () => {
  const sourcePaths = resolveJsSourcePaths(
    "/tmp/repository",
    "fallback",
    ["/tmp/repository/src/index.ts", "/tmp/repository/README.md"],
    [
      {
        id: "js",
        metadata: {
          sourcePaths: ["src/fallback.ts", "README.md"],
        },
      },
    ],
  );

  assert.deepEqual(sourcePaths, ["src/index.ts"]);
});

test("complexity plugin helpers build findings and metrics from normalized results", () => {
  const runnerResult = normalizeRunnerResult({
    metrics: [
      {
        path: "src/index.ts",
        cyclomatic: 24,
        logicalSloc: 18,
        maintainability: 99,
      },
    ],
    skippedFiles: [
      {
        path: "src/problem.ts",
        message: "parse failed",
      },
    ],
  });
  const findings = createComplexityFindings({
    repositoryRoot: "/tmp/repository",
    metrics: runnerResult.metrics,
    skippedFiles: runnerResult.skippedFiles,
    previousMetrics: createPreviousMetricsMap([
      {
        path: "src/index.ts",
        cyclomatic: 18,
        logicalSloc: 14,
        maintainability: 110,
      },
    ]),
    warningThreshold: 20,
    errorThreshold: 35,
    regressionDelta: 5,
  });
  const metrics = createSnapshotMetrics({
    candidateSourceCount: 3,
    sourcePathCount: 2,
    metrics: runnerResult.metrics,
    skippedFiles: runnerResult.skippedFiles,
  });

  assert.deepEqual(
    findings.map((finding) => finding.category),
    ["complexity-threshold", "complexity-regression", "complexity-analysis-skipped"],
  );
  assert.equal(findings[0]?.severity, "warning");
  assert.equal(findings[1]?.metrics?.previousCyclomatic, 18);
  assert.equal(findings[2]?.details?.errorMessage, "parse failed");
  assert.deepEqual(metrics, {
    filesAnalyzed: 1,
    skippedFileCount: 1,
    maxCyclomatic: 24,
    excludedPathCount: 1,
  });
});
