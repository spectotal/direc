import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { scanRepository } from "../src/scan.js";
import { expandWorkspacePattern } from "../src/workspace.js";
import { findSourcePathsForRoot } from "../src/workspace-utils.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("expandWorkspacePattern resolves workspace globs for the mixed fixture", async () => {
  const workspaceRoot = resolve(fixturesRoot, "mixed-workspace");
  const expanded = await expandWorkspacePattern(workspaceRoot, "packages/*");

  assert.deepEqual(expanded, ["packages/web"]);
});

test("findSourcePathsForRoot excludes non-production source paths", () => {
  const sourcePaths = findSourcePathsForRoot(
    [
      "packages/web/src/app.tsx",
      "packages/web/src/types.d.ts",
      "packages/web/test/fixtures/story.ts",
    ],
    "packages/web",
  );

  assert.deepEqual(sourcePaths, ["packages/web/src/app.tsx"]);
});

test("scanRepository preserves the mixed fixture's analyzable source scope", async () => {
  const scan = await scanRepository(resolve(fixturesRoot, "mixed-workspace"));

  assert.ok(scan.nodeSourcePaths.includes("packages/web/test/fixtures/story.ts"));
  assert.deepEqual(
    scan.analyzableNodeSourcePaths.includes("packages/web/test/fixtures/story.ts"),
    false,
  );
  assert.deepEqual(scan.analyzableNodeSourcePaths.includes("packages/web/src/types.d.ts"), false);
});
