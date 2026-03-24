import assert from "node:assert/strict";
import test from "node:test";
import { collectBoundaryViolations } from "../src/findings.js";
import { resolveTargetPaths, resolveTsConfigPath } from "../src/scope.js";

test("resolveTargetPaths prefers event-scoped source files over facet metadata", () => {
  const targetPaths = resolveTargetPaths(
    process.cwd(),
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

test("collectBoundaryViolations matches disallowed dependency prefixes", () => {
  const findings = collectBoundaryViolations(
    process.cwd(),
    {
      "packages/cli/direc/src/lib/config.ts": [
        "packages/cli/direc/src/commands/init.ts",
        "packages/cli/direc/src/lib/fs.ts",
      ],
    },
    [
      {
        from: "packages/cli/direc/src/lib",
        disallow: ["packages/cli/direc/src/commands"],
        message: "CLI libs must not depend on commands.",
      },
    ],
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.category, "forbidden-dependency");
  assert.equal(findings[0]?.scope.dependency?.to, "packages/cli/direc/src/commands/init.ts");
});
