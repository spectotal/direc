import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { createJsComplexityNode } from "../src/index.js";
import { analyzeSource, runComplexityTool } from "../src/engine.js";

const fixturesRoot = resolve(process.cwd(), "test", "fixtures", "simple-project");

test("analyzeSource preserves legacy-style metrics for a simple function", () => {
  const filePath = resolve(fixturesRoot, "src/index.ts");
  const source = `
export function score(value: number): number {
  if (value > 10) {
    return value * 2;
  }

  if (value > 5) {
    return value + 1;
  }

  return value;
}
`.trimStart();

  assert.deepEqual(analyzeSource(source, filePath), {
    cyclomatic: 4,
    logicalSloc: 6,
    maintainability: 134.271,
  });
});

test("analyzeSource ignores type-only syntax in complexity metrics", () => {
  const filePath = resolve(fixturesRoot, "src/types-only.ts");
  const source = `
import type { Config } from "./config";

export type Result = Config | string;

export interface Shape {
  value: string;
}
`.trimStart();

  assert.deepEqual(analyzeSource(source, filePath), {
    cyclomatic: 1,
    logicalSloc: 0,
    maintainability: 171,
  });
});

test("runComplexityTool parses modern TypeScript syntax without skipping valid files", async () => {
  const result = await runComplexityTool({
    repositoryRoot: fixturesRoot,
    sourcePaths: ["src/modern.ts", "src/types-only.ts"],
  });

  assert.deepEqual(result.skippedFiles, []);
  assert.deepEqual(
    result.metrics.map((metric) => metric.path),
    ["src/modern.ts", "src/types-only.ts"],
  );

  const modernMetric = result.metrics.find((metric) => metric.path === "src/modern.ts");
  assert.ok(modernMetric);
  assert.equal(modernMetric.cyclomatic, 7);
  assert.equal(modernMetric.logicalSloc, 12);
  assert.equal(modernMetric.maintainability, 117.277);

  const typesOnlyMetric = result.metrics.find((metric) => metric.path === "src/types-only.ts");
  assert.ok(typesOnlyMetric);
  assert.equal(typesOnlyMetric.cyclomatic, 1);
  assert.equal(typesOnlyMetric.logicalSloc, 0);
  assert.equal(typesOnlyMetric.maintainability, 171);
});

test("js-complexity respects explicit empty path scopes without falling back to project files", async () => {
  const repositoryRoot = fixturesRoot;
  const sourceFiles = [resolve(fixturesRoot, "src/index.ts")];
  const observedCalls: string[][] = [];
  const node = createJsComplexityNode({
    async runner(options) {
      observedCalls.push(options.sourcePaths);
      return {
        metrics: [],
        skippedFiles: [],
      };
    },
  });

  const outputs = await node.run({
    repositoryRoot,
    runId: "run-1",
    pipelineId: "repository-quality",
    sourceId: "repository",
    toolConfig: {
      id: "jsComplexity",
      kind: "builtin",
      plugin: "js-complexity",
      enabled: true,
      options: {},
    },
    projectContext: {
      repositoryRoot,
      facets: [{ id: "js", evidence: ["fixture"] }],
      sourceFiles,
      hasGit: false,
      hasOpenSpec: false,
    },
    inputArtifacts: [
      {
        id: "seed-1",
        type: "source.repository.scope",
        producerId: "repository",
        runId: "run-1",
        pipelineId: "repository-quality",
        sourceId: "repository",
        scope: {
          kind: "paths",
          paths: [],
        },
        inputArtifactIds: [],
        timestamp: new Date().toISOString(),
        payload: {
          paths: [],
        },
      },
    ],
    options: {},
    now: () => new Date(),
  });

  assert.deepEqual(observedCalls, [[]]);
  assert.deepEqual(outputs[0]?.scope.paths, []);
  assert.deepEqual((outputs[0]?.payload as { paths: string[] }).paths, []);
});
