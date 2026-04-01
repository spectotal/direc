import assert from "node:assert/strict";
import test from "node:test";
import { complexityFindingsNode } from "../src/index.js";

test("complexityFindingsNode emits only warning, error, and skipped files", async () => {
  const [artifact] = await complexityFindingsNode.run({
    repositoryRoot: "/repo",
    runId: "run-1",
    pipelineId: "diff-quality",
    sourceId: "diff",
    toolConfig: {
      id: "complexityFindings",
      plugin: "complexity-findings",
      kind: "builtin",
      enabled: true,
    },
    projectContext: {
      repositoryRoot: "/repo",
      facets: [{ id: "js", evidence: ["fixture"] }],
      sourceFiles: [],
      hasGit: true,
      hasOpenSpec: false,
    },
    inputArtifacts: [
      {
        id: "metric-1",
        type: "metric.complexity",
        producerId: "js-complexity",
        runId: "run-1",
        pipelineId: "diff-quality",
        sourceId: "diff",
        inputArtifactIds: [],
        timestamp: new Date().toISOString(),
        scope: {
          kind: "paths",
          paths: ["/repo/src/index.ts", "/repo/src/helper.ts", "/repo/src/error.ts"],
        },
        payload: {
          paths: ["/repo/src/index.ts", "/repo/src/helper.ts", "/repo/src/error.ts"],
          files: [
            {
              path: "/repo/src/index.ts",
              cyclomatic: 12,
              logicalSloc: 10,
              maintainability: 90,
            },
            {
              path: "/repo/src/helper.ts",
              cyclomatic: 4,
              logicalSloc: 4,
              maintainability: 120,
            },
            {
              path: "/repo/src/error.ts",
              cyclomatic: 24,
              logicalSloc: 18,
              maintainability: 72,
            },
          ],
          skippedFiles: [
            {
              path: "/repo/src/generated.ts",
              message: "unsupported syntax",
            },
          ],
          warningThreshold: 10,
          errorThreshold: 20,
          warningCount: 2,
          errorCount: 1,
          thresholdWarningCount: 1,
          thresholdErrorCount: 1,
          skippedFileCount: 1,
          maxCyclomatic: 24,
        },
      },
    ],
    options: {},
    now: () => new Date("2026-04-01T00:00:00.000Z"),
  });

  assert.ok(artifact);
  assert.equal(artifact.type, "evaluation.complexity-findings");
  assert.deepEqual(artifact.scope.paths, [
    "/repo/src/error.ts",
    "/repo/src/generated.ts",
    "/repo/src/index.ts",
  ]);
  assert.deepEqual((artifact.payload as { warningFiles: Array<{ path: string }> }).warningFiles, [
    {
      path: "/repo/src/index.ts",
      cyclomatic: 12,
      logicalSloc: 10,
      maintainability: 90,
    },
  ]);
  assert.deepEqual((artifact.payload as { errorFiles: Array<{ path: string }> }).errorFiles, [
    {
      path: "/repo/src/error.ts",
      cyclomatic: 24,
      logicalSloc: 18,
      maintainability: 72,
    },
  ]);
  assert.deepEqual((artifact.payload as { skippedFiles: Array<{ path: string }> }).skippedFiles, [
    {
      path: "/repo/src/generated.ts",
      message: "unsupported syntax",
    },
  ]);
});
