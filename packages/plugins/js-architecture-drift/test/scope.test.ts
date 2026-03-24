import assert from "node:assert/strict";
import test from "node:test";
import { resolveTargetPaths, resolveTsConfigPath } from "../src/scope.js";

test("resolveTargetPaths prefers event-scoped source files over facet metadata", () => {
  const targetPaths = resolveTargetPaths(
    process.cwd(),
    undefined,
    [
      `${process.cwd()}/README.md`,
      `${process.cwd()}/src/feature.ts`,
      `${process.cwd()}/src/feature.test.ts`,
    ],
    [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: ["src/fallback.ts"],
          packageBoundaries: [{ root: "." }],
        },
      },
    ],
  );

  assert.deepEqual(targetPaths, ["src/feature.test.ts", "src/feature.ts"]);
});

test("resolveTargetPaths honors strict path scopes without falling back", () => {
  const targetPaths = resolveTargetPaths(
    process.cwd(),
    "strict",
    [`${process.cwd()}/README.md`],
    [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: ["src/fallback.ts"],
        },
      },
    ],
  );

  assert.deepEqual(targetPaths, []);
});

test("resolveTsConfigPath falls back to the js facet metadata", () => {
  const tsConfigPath = resolveTsConfigPath([
    {
      id: "js",
      confidence: "high",
      evidence: ["fixture"],
      metadata: {
        tsconfigPaths: ["packages/app/tsconfig.json"],
      },
    },
  ]);

  assert.equal(tsConfigPath, "packages/app/tsconfig.json");
});
