import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type AnalyzerPlugin,
  type DetectedFacet,
  type DirecConfig,
  type NormalizedWorkflowEvent,
} from "direc-analysis-runtime";
import { watchAutomation } from "../src/lib/automation-runner.js";

test("watchAutomation processes a work item event and dispatches the configured backend", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-automation-"));
  const event: NormalizedWorkflowEvent = {
    type: WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION,
    source: WORKFLOW_IDS.OPENSPEC,
    timestamp: new Date().toISOString(),
    repositoryRoot,
    change: {
      id: "demo-change",
      schema: "spec-driven",
      revision: "tasks:done",
    },
    workItem: {
      id: "1.1",
      title: "Implement automation",
      sourcePath: join(repositoryRoot, "openspec", "changes", "demo-change", "tasks.md"),
      fromState: "pending",
      toState: "done",
    },
    pathScopes: [join(repositoryRoot, "src", "feature.ts")],
  };
  const detectedFacets: DetectedFacet[] = [
    {
      id: "js",
      confidence: "high",
      evidence: ["package.json"],
      metadata: {},
    },
  ];
  const analyzers: AnalyzerPlugin[] = [
    {
      id: "mock-analyzer",
      displayName: "Mock Analyzer",
      supportedFacets: ["js"],
      async run(context) {
        return {
          analyzerId: "mock-analyzer",
          timestamp: new Date().toISOString(),
          repositoryRoot: context.repositoryRoot,
          event: context.event,
          findings: [
            {
              fingerprint: "mock:file",
              analyzerId: "mock-analyzer",
              facetId: "js",
              severity: "warning",
              category: "demo",
              message: "demo finding",
              scope: {
                kind: "file",
                path: join(context.repositoryRoot, "src", "feature.ts"),
              },
            },
          ],
        };
      },
    },
  ];
  const config: DirecConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW_IDS.OPENSPEC,
    facets: ["js"],
    analyzers: {
      "mock-analyzer": {
        enabled: true,
      },
    },
    automation: {
      enabled: true,
      mode: "advisory",
      invocation: "hybrid",
      failurePolicy: "continue",
      transport: {
        kind: "command",
        command: process.execPath,
        args: [
          "-e",
          "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({status:'success',verdict:'inform',summary:'external'})));",
        ],
      },
      triggers: {
        workItemTransitions: true,
        artifactTransitions: false,
        changeCompleted: true,
      },
    },
  };

  let closeCalled = false;
  const outcome = await new Promise<
    Awaited<Parameters<Parameters<typeof watchAutomation>[0]["onResult"]>[0]>
  >(async (resolve) => {
    const watcher = await watchAutomation({
      repositoryRoot,
      workflowAdapter: {
        id: WORKFLOW_IDS.OPENSPEC,
        displayName: "OpenSpec",
        supportsAutomation: true,
        async loadAnalysisEvents() {
          return [];
        },
        async watchEvents({ onEvent }) {
          queueMicrotask(() => {
            onEvent(event);
          });
          return {
            close: () => {
              closeCalled = true;
            },
          };
        },
      },
      detectedFacets,
      analyzers,
      config,
      onResult: resolve,
    });

    watcher.close();
  });

  assert.equal(closeCalled, true);
  assert.equal(outcome.analysis.runs[0]?.status, "success");
  assert.equal(outcome.automation.triggered, true);
  assert.equal(outcome.automation.result?.summary, "external");
  assert.match(outcome.automation.requestPath ?? "", /\.direc\/automation\/requests\//);
  assert.match(outcome.automation.resultPath ?? "", /\.direc\/automation\/results\//);
});
