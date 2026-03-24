import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type AnalyzerFinding,
  type DetectedFacet,
  type NormalizedWorkflowEvent,
  type QualityRoutineConfig,
} from "@spectotal/direc-analysis-runtime";
import {
  createQualityRoutineAnalyzers,
  type QualityRoutineAdapter,
} from "../src/quality-routines.js";

const detectedFacets: DetectedFacet[] = [
  {
    id: "js",
    confidence: "high",
    evidence: ["fixture"],
    metadata: {
      sourcePaths: ["src/index.ts"],
    },
  },
];

function createEvent(repositoryRoot: string): NormalizedWorkflowEvent {
  return {
    type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
    source: WORKFLOW_IDS.DIREC,
    timestamp: new Date().toISOString(),
    repositoryRoot,
    pathScopes: [join(repositoryRoot, "src", "index.ts")],
  };
}

test("createQualityRoutineAnalyzers supports run mode", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-quality-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const demo = 1;\n");

  const adapters: QualityRoutineAdapter[] = [
    {
      id: "demo-run",
      displayName: "Demo Run",
      supportedFacets: ["js"],
      supportsScopedPaths: true,
      parseRunResult(options) {
        return {
          findings: [
            {
              fingerprint: "demo-run:file",
              analyzerId: "routine:demo-run",
              severity: "warning",
              category: "demo",
              message: options.execution.stdout.trim(),
              scope: {
                kind: "file",
                path: join(options.repositoryRoot, "src", "index.ts"),
              },
            } satisfies AnalyzerFinding,
          ],
        };
      },
    },
  ];
  const qualityRoutines: Record<string, QualityRoutineConfig> = {
    "demo-run": {
      adapter: "demo-run",
      mode: "run",
      enabled: true,
      command: {
        command: process.execPath,
        args: ["-e", "process.stdout.write('run-mode');"],
      },
    },
  };

  const analyzers = createQualityRoutineAnalyzers({
    repositoryRoot,
    qualityRoutines,
    adapters,
  });

  assert.equal(analyzers[0]?.id, "routine:demo-run");
  const prerequisite = await analyzers[0]?.prerequisites?.[0]?.check({
    repositoryRoot,
    detectedFacets,
    event: createEvent(repositoryRoot),
  });
  assert.equal(prerequisite?.ok, true);

  const snapshot = await analyzers[0]?.run({
    repositoryRoot,
    event: createEvent(repositoryRoot),
    detectedFacets,
    options: {},
    previousSnapshot: null,
  });

  assert.equal(snapshot?.findings[0]?.message, "run-mode");
});

test("createQualityRoutineAnalyzers supports ingest mode", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-quality-"));
  await mkdir(join(repositoryRoot, "reports"), { recursive: true });
  await writeFile(join(repositoryRoot, "reports", "quality.txt"), "ingest-mode\n", "utf8");

  const adapters: QualityRoutineAdapter[] = [
    {
      id: "demo-ingest",
      displayName: "Demo Ingest",
      supportedFacets: ["js"],
      parseReport(options) {
        return {
          findings: [
            {
              fingerprint: "demo-ingest:repository",
              analyzerId: "routine:demo-ingest",
              severity: "error",
              category: "demo",
              message: options.contents.trim(),
              scope: {
                kind: "repository",
                path: options.repositoryRoot,
              },
            } satisfies AnalyzerFinding,
          ],
        };
      },
    },
  ];
  const qualityRoutines: Record<string, QualityRoutineConfig> = {
    "demo-ingest": {
      adapter: "demo-ingest",
      mode: "ingest",
      enabled: true,
      report: {
        reportPath: "reports/quality.txt",
      },
    },
  };

  const analyzers = createQualityRoutineAnalyzers({
    repositoryRoot,
    qualityRoutines,
    adapters,
  });

  const snapshot = await analyzers[0]?.run({
    repositoryRoot,
    event: createEvent(repositoryRoot),
    detectedFacets,
    options: {},
    previousSnapshot: null,
  });

  assert.equal(snapshot?.findings[0]?.message, "ingest-mode");
});
