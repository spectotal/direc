import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getNodeQualityAdapters } from "../src/quality-routines/node-adapters.js";
import { getPythonQualityAdapters } from "../src/quality-routines/python-adapters.js";

test("node quality adapters keep eslint report parsing and typescript tsconfig targeting", async () => {
  const adapters = getNodeQualityAdapters();
  const eslint = adapters.find((adapter) => adapter.id === "eslint");
  const typescript = adapters.find((adapter) => adapter.id === "typescript");

  assert.ok(eslint?.parseReport);
  assert.ok(typescript?.detect);

  const eslintConfig = await eslint?.detect?.({
    repositoryRoot: "/tmp/repository",
    scan: {
      files: [],
    },
    detectedFacets: [{ id: "js" }],
    rootManifest: {
      devDependencies: {
        eslint: "^9.0.0",
      },
    },
  } as never);
  const typescriptConfig = await typescript?.detect?.({
    repositoryRoot: "/tmp/repository",
    scan: {
      tsconfigPaths: ["packages/app/tsconfig.json"],
    },
    detectedFacets: [{ id: "js" }],
    rootManifest: null,
  } as never);

  assert.equal(eslintConfig?.command?.args.join(" "), "exec -- eslint --format json");
  assert.deepEqual(typescriptConfig?.command?.args, [
    "exec",
    "--",
    "tsc",
    "--noEmit",
    "--pretty",
    "false",
    "-p",
    "packages/app/tsconfig.json",
  ]);
});

test("python quality adapters detect pyproject-backed tools through shared helpers", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-python-"));
  await writeFile(join(repositoryRoot, "pyproject.toml"), "[tool.ruff]\nline-length = 88\n");
  const ruff = getPythonQualityAdapters().find((adapter) => adapter.id === "ruff");

  const config = await ruff?.detect?.({
    repositoryRoot,
    scan: {
      files: [],
      pythonConfigPaths: [],
    },
    detectedFacets: [{ id: "python" }],
    rootManifest: null,
  } as never);

  assert.deepEqual(config?.command?.args, ["-m", "ruff", "check", "--output-format", "json"]);
});
