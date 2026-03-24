import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJsArchitectureDriftPlugin } from "../src/index.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("architecture drift plugin reports cycles and forbidden dependencies", async () => {
  const repositoryRoot = resolve(fixturesRoot, "layered-project");
  const plugin = createJsArchitectureDriftPlugin();

  const snapshot = await plugin.run({
    repositoryRoot,
    event: {
      type: "snapshot",
      source: "openspec",
      timestamp: new Date().toISOString(),
      repositoryRoot,
    },
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          packageBoundaries: [{ root: "." }],
          tsconfigPaths: ["tsconfig.json"],
        },
      },
    ],
    options: {
      excludePaths: [],
      boundaryRules: [
        {
          from: "src/core",
          disallow: ["src/ui"],
          message: "Core code must not depend on UI code.",
        },
      ],
    },
    previousSnapshot: null,
  });

  const categories = snapshot.findings.map((finding) => finding.category).sort();
  assert.deepEqual(categories, ["cycle", "forbidden-dependency"]);
  assert.ok(snapshot.findings.every((finding) => finding.severity === "error"));
});

test("architecture drift plugin excludes fixture-only cycles by default", async () => {
  const plugin = createJsArchitectureDriftPlugin({
    async runner() {
      return {
        graph: {
          "test/fixtures/a.ts": ["test/fixtures/b.ts"],
          "test/fixtures/b.ts": ["test/fixtures/a.ts"],
        },
        circular: [["test/fixtures/a.ts", "test/fixtures/b.ts"]],
      };
    },
  });

  const snapshot = await plugin.run({
    repositoryRoot: process.cwd(),
    event: {
      type: "snapshot",
      source: "openspec",
      timestamp: new Date().toISOString(),
      repositoryRoot: process.cwd(),
    },
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: ["test/fixtures/a.ts", "test/fixtures/b.ts"],
        },
      },
    ],
    options: {},
    previousSnapshot: null,
  });

  assert.equal(snapshot.findings.length, 0);
  assert.equal(snapshot.metrics?.cycleCount, 0);
});

test("architecture drift plugin surfaces missing prerequisites", async () => {
  const plugin = createJsArchitectureDriftPlugin({
    async prerequisiteCheck() {
      return {
        ok: false,
        summary: "madge is missing",
      };
    },
  });

  const result = await plugin.prerequisites?.[0]?.check({
    repositoryRoot: process.cwd(),
    detectedFacets: [],
  });

  assert.deepEqual(result, {
    ok: false,
    summary: "madge is missing",
  });
});
