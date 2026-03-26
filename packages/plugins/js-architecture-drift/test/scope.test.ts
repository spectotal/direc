import assert from "node:assert/strict";
import test from "node:test";
import { resolveTargetPaths, resolveTsConfigPath } from "../src/scope.js";

test("resolveTargetPaths falls back to package boundaries", () => {
  const targetPaths = resolveTargetPaths(
    process.cwd(),
    undefined,
    [`${process.cwd()}/README.md`],
    [{ root: "packages/core" }, { root: "packages/ui" }],
  );

  assert.deepEqual(targetPaths, ["packages/core", "packages/ui"]);
});

test("resolveTsConfigPath falls back to discovered paths", () => {
  const tsConfigPath = resolveTsConfigPath(["packages/app/tsconfig.json"]);

  assert.equal(tsConfigPath, "packages/app/tsconfig.json");
});
