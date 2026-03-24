import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { WORKFLOW_IDS } from "@spectotal/direc-analysis-runtime";
import { getBuiltinAnalyzers } from "../src/analyzers.js";
import { buildDirecConfig } from "../src/config.js";

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

test("buildDirecConfig keeps desired analyzers enabled and seeds automation defaults", async () => {
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
    plugins: getBuiltinAnalyzers(),
  });

  const architectureConfig = config.analyzers["js-architecture-drift"];
  const moduleRoles = architectureConfig?.options?.moduleRoles;
  const roleBoundaryRules = architectureConfig?.options?.roleBoundaryRules;

  assert.equal("boundaryRules" in (architectureConfig?.options ?? {}), false);
  assert.ok(Array.isArray(moduleRoles));
  assert.deepEqual(moduleRoles, []);
  assert.ok(Array.isArray(roleBoundaryRules));
  assert.deepEqual(roleBoundaryRules, []);
  assert.equal(config.workflow, WORKFLOW_IDS.DIREC);
  assert.equal(config.automation.mode, "advisory");
  assert.equal(config.automation.invocation, "hybrid");
  assert.equal(config.automation.transport.kind, "command");
  assert.equal(config.automation.triggers.snapshotEvents, true);
  assert.equal(config.automation.triggers.workItemTransitions, true);
  assert.equal(config.automation.triggers.changeCompleted, true);
  assert.equal(config.automation.triggers.artifactTransitions, false);
});
