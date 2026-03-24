import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  processWorkflowEvent,
  readLatestAnalyzerSnapshot,
  resolveAnalyzers,
  writeDirecConfig,
} from "../src/index.js";
import type {
  AnalyzerPlugin,
  DetectedFacet,
  DirecConfig,
  NormalizedWorkflowEvent,
} from "../src/index.js";

const detectedFacets: DetectedFacet[] = [
  {
    id: "js",
    confidence: "high",
    evidence: ["package.json", "tsconfig.json"],
    metadata: {},
  },
];

function createConfig(): DirecConfig {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: detectedFacets.map((facet) => facet.id),
    analyzers: {
      mock: {
        enabled: true,
      },
      disabled: {
        enabled: false,
      },
    },
  };
}

function createEvent(repositoryRoot: string): NormalizedWorkflowEvent {
  return {
    type: "transition",
    source: "openspec",
    timestamp: new Date().toISOString(),
    repositoryRoot,
    change: {
      id: "demo-change",
      schema: "spec-driven",
      revision: "proposal:done|tasks:ready",
    },
    artifact: {
      id: "tasks",
      fromStatus: "ready",
      toStatus: "done",
      outputPath: "tasks.md",
    },
    pathScopes: [join(repositoryRoot, "tasks.md")],
  };
}

test("resolveAnalyzers enables matching analyzers and reports skip reasons", async () => {
  const plugins: AnalyzerPlugin[] = [
    {
      id: "mock",
      displayName: "Mock Analyzer",
      supportedFacets: ["js"],
      async run() {
        throw new Error("not used in this test");
      },
    },
    {
      id: "disabled",
      displayName: "Disabled Analyzer",
      supportedFacets: ["js"],
      async run() {
        throw new Error("not used in this test");
      },
    },
    {
      id: "wrong-facet",
      displayName: "Wrong Facet Analyzer",
      supportedFacets: ["tailwind"],
      async run() {
        throw new Error("not used in this test");
      },
    },
  ];

  const resolution = await resolveAnalyzers({
    plugins,
    repositoryRoot: process.cwd(),
    detectedFacets,
    config: createConfig().analyzers,
  });

  assert.deepEqual(
    resolution.enabled.map((entry) => entry.plugin.id),
    ["mock"],
  );
  assert.equal(resolution.disabled.length, 2);
  assert.equal(
    resolution.disabled.find((entry) => entry.pluginId === "disabled")?.reasons[0].code,
    "disabled_in_config",
  );
  assert.equal(
    resolution.disabled.find((entry) => entry.pluginId === "wrong-facet")?.reasons[0].code,
    "facet_mismatch",
  );
});

test("processWorkflowEvent persists analyzer snapshots", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-runtime-"));
  const config = createConfig();
  await writeDirecConfig(repositoryRoot, config);
  const legacyStatePath = join(repositoryRoot, ".direc", "state.json");
  await writeFile(legacyStatePath, '{"legacy":true}\n');

  const plugins: AnalyzerPlugin[] = [
    {
      id: "mock",
      displayName: "Mock Analyzer",
      supportedFacets: ["js"],
      async run(context) {
        return {
          analyzerId: "mock",
          timestamp: new Date().toISOString(),
          repositoryRoot: context.repositoryRoot,
          event: context.event,
          findings: [
            {
              fingerprint: "mock:file",
              analyzerId: "mock",
              facetId: "js",
              severity: "warning",
              category: "complexity",
              message: "A file exceeded the threshold.",
              scope: {
                kind: "file",
                path: join(context.repositoryRoot, "src/index.ts"),
              },
              metrics: {
                cyclomatic: 14,
              },
            },
          ],
          metrics: {
            files: 1,
          },
        };
      },
    },
  ];

  const result = await processWorkflowEvent({
    repositoryRoot,
    event: createEvent(repositoryRoot),
    detectedFacets,
    plugins,
    config,
  });

  assert.equal(result.runs[0]?.status, "success");

  const snapshot = await readLatestAnalyzerSnapshot(repositoryRoot, "mock");
  assert.ok(snapshot);
  assert.equal(snapshot?.findings[0]?.message, "A file exceeded the threshold.");
  assert.equal(await readFile(legacyStatePath, "utf8"), '{"legacy":true}\n');
});

test("readLatestAnalyzerSnapshot returns the current analyzer snapshot", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-runtime-"));
  const config: DirecConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js"],
    analyzers: {
      "js-complexity": {
        enabled: true,
      },
    },
  };

  await writeDirecConfig(repositoryRoot, config);
  await processWorkflowEvent({
    repositoryRoot,
    event: createEvent(repositoryRoot),
    detectedFacets,
    plugins: [
      {
        id: "js-complexity",
        displayName: "JS Complexity",
        supportedFacets: ["js"],
        async run(context) {
          return {
            analyzerId: "js-complexity",
            timestamp: new Date().toISOString(),
            repositoryRoot: context.repositoryRoot,
            event: context.event,
            findings: [
              {
                fingerprint: "js:file",
                analyzerId: "js-complexity",
                facetId: "js",
                severity: "warning",
                category: "complexity-threshold",
                message: "current finding",
                scope: {
                  kind: "file",
                  path: join(context.repositoryRoot, "src/index.ts"),
                },
              },
            ],
          };
        },
      },
    ],
    config,
  });

  const snapshot = await readLatestAnalyzerSnapshot(repositoryRoot, "js-complexity");

  assert.ok(snapshot);
  assert.equal(snapshot?.analyzerId, "js-complexity");
  assert.equal(snapshot?.findings[0]?.analyzerId, "js-complexity");
  assert.equal(snapshot?.findings[0]?.facetId, "js");
});
