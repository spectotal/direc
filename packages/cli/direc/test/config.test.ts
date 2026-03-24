import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getRegisteredAnalyzers } from "../src/lib/analyzers.js";
import { buildDirecConfig } from "../src/lib/config.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

test("root workspace uses nested role-based package globs", async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(repositoryRoot, "package.json"), "utf8"),
  ) as {
    workspaces: string[];
  };

  assert.deepEqual(packageJson.workspaces, [
    "packages/cli/*",
    "packages/core/*",
    "packages/adapters/*",
    "packages/facets/*",
    "packages/plugins/*",
  ]);
});

test("buildDirecConfig seeds repository boundary rules for architecture drift", async () => {
  const { config } = await buildDirecConfig({
    repositoryRoot,
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["fixture"],
        metadata: {
          sourcePaths: ["packages/cli/direc/src/index.ts"],
        },
      },
    ],
    plugins: getRegisteredAnalyzers(),
  });

  const architectureConfig = config.analyzers["js-architecture-drift"];
  const boundaryRules = architectureConfig?.options?.boundaryRules;

  assert.ok(Array.isArray(boundaryRules));
  assert.equal(boundaryRules.length, 3);
  assert.deepEqual(boundaryRules.map((rule) => rule.from).sort(), [
    "packages/adapters/openspec/src/events.ts",
    "packages/adapters/openspec/src/status.ts",
    "packages/cli/direc/src/lib",
  ]);
});
