import assert from "node:assert/strict";
import test from "node:test";
import { formatAnalysisResult } from "../src/lib/analysis-output.js";

test("formatAnalysisResult includes report paths and findings summary", () => {
  const output = formatAnalysisResult({
    event: {
      type: "snapshot",
      source: "openspec",
      timestamp: new Date().toISOString(),
      repositoryRoot: process.cwd(),
      change: {
        id: "demo",
      },
    },
    resolution: {
      enabled: [
        {
          plugin: {
            id: "js-complexity",
            displayName: "JS Complexity",
            supportedFacets: ["js"],
            run: async () => {
              throw new Error("not used");
            },
          },
          options: {},
          prerequisiteResults: [],
        },
      ],
      disabled: [],
    },
    runs: [
      {
        analyzerId: "js-complexity",
        status: "success",
        latestPath: ".direc/latest/js-complexity.json",
        snapshot: {
          analyzerId: "js-complexity",
          timestamp: new Date().toISOString(),
          repositoryRoot: process.cwd(),
          event: {
            type: "snapshot",
            source: "openspec",
            timestamp: new Date().toISOString(),
            repositoryRoot: process.cwd(),
          },
          findings: [
            {
              fingerprint: "demo",
              analyzerId: "js-complexity",
              severity: "warning",
              category: "complexity-threshold",
              message: "demo file exceeds the configured cyclomatic threshold.",
              scope: {
                kind: "file",
                path: "/tmp/demo.ts",
              },
            },
          ],
        },
      },
    ],
  });

  assert.match(output, /reports:/);
  assert.match(output, /top findings:/);
  assert.match(output, /\.direc\/latest\/js-complexity\.json/);
  assert.match(output, /\[warning\] complexity-threshold/);
});
