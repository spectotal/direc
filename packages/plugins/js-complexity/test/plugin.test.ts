import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJsComplexityPlugin } from "../src/index.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("complexity plugin reports threshold and regression findings", async () => {
  const plugin = createJsComplexityPlugin({
    async runner() {
      return [
        {
          path: "src/index.ts",
          cyclomatic: 13,
          logicalSloc: 12,
          maintainability: 72,
        },
      ];
    },
  });

  const snapshot = await plugin.run({
    repositoryRoot: resolve(fixturesRoot, "simple-project"),
    event: {
      type: "transition",
      source: "openspec",
      timestamp: new Date().toISOString(),
      repositoryRoot: resolve(fixturesRoot, "simple-project"),
      pathScopes: [resolve(fixturesRoot, "simple-project", "src/index.ts")],
    },
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: ["src/index.ts"],
        },
      },
    ],
    options: {
      warningThreshold: 10,
      errorThreshold: 12,
      regressionDelta: 2,
    },
    previousSnapshot: {
      analyzerId: "js-complexity",
      timestamp: new Date().toISOString(),
      repositoryRoot: resolve(fixturesRoot, "simple-project"),
      event: {
        type: "snapshot",
        source: "openspec",
        timestamp: new Date().toISOString(),
        repositoryRoot: resolve(fixturesRoot, "simple-project"),
      },
      findings: [],
      metadata: {
        files: [
          {
            path: "src/index.ts",
            cyclomatic: 10,
            logicalSloc: 10,
            maintainability: 80,
          },
        ],
      },
    },
  });

  assert.equal(snapshot.findings.length, 2);
  assert.equal(snapshot.findings[0]?.category, "complexity-threshold");
  assert.equal(snapshot.findings[0]?.severity, "error");
  assert.equal(snapshot.findings[1]?.category, "complexity-regression");
  assert.equal(snapshot.findings[1]?.severity, "error");
});

test("complexity plugin excludes fixture-like paths by default", async () => {
  let receivedSourcePaths: string[] = [];
  const plugin = createJsComplexityPlugin({
    async runner({ sourcePaths }) {
      receivedSourcePaths = sourcePaths;
      return [];
    },
  });

  const snapshot = await plugin.run({
    repositoryRoot: resolve(fixturesRoot, "simple-project"),
    event: {
      type: "snapshot",
      source: "openspec",
      timestamp: new Date().toISOString(),
      repositoryRoot: resolve(fixturesRoot, "simple-project"),
    },
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: [
            "src/index.ts",
            "test/fixtures/demo.ts",
            "scripts/build.ts",
            "src/types.d.ts",
          ],
        },
      },
    ],
    options: {},
    previousSnapshot: null,
  });

  assert.deepEqual(receivedSourcePaths, ["src/index.ts"]);
  assert.equal(snapshot.metrics?.excludedPathCount, 3);
});

test("complexity plugin surfaces missing prerequisites", async () => {
  const plugin = createJsComplexityPlugin({
    async prerequisiteCheck() {
      return {
        ok: false,
        summary: "typhonjs-escomplex is missing",
      };
    },
  });

  const result = await plugin.prerequisites?.[0]?.check({
    repositoryRoot: process.cwd(),
    detectedFacets: [],
  });

  assert.deepEqual(result, {
    ok: false,
    summary: "typhonjs-escomplex is missing",
  });
});
