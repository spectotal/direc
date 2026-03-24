import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type AutomationConfig,
  type RuntimeExecutionResult,
} from "direc-analysis-runtime";
import {
  buildSubagentRequest,
  createSubagentBackend,
  dispatchAutomationEvent,
  readLatestSubagentResult,
} from "../src/index.js";

function createAutomationConfig(overrides: Partial<AutomationConfig> = {}): AutomationConfig {
  return {
    enabled: true,
    mode: "advisory",
    invocation: "hybrid",
    failurePolicy: "continue",
    transport: {
      kind: "command",
      command: process.execPath,
      args: [
        "-e",
        "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({status:'success',verdict:'inform',summary:'ok'})));",
      ],
    },
    triggers: {
      workItemTransitions: true,
      artifactTransitions: false,
      changeCompleted: true,
    },
    ...overrides,
  };
}

function createAnalysisResult(repositoryRoot: string): RuntimeExecutionResult {
  return {
    event: {
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
    },
    resolution: {
      enabled: [
        {
          plugin: {
            id: "js-complexity",
            displayName: "JS Complexity",
            supportedFacets: ["js"],
            async run() {
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
        latestPath: join(repositoryRoot, ".direc", "latest", "js-complexity.json"),
        snapshot: {
          analyzerId: "js-complexity",
          timestamp: new Date().toISOString(),
          repositoryRoot,
          event: {
            type: WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION,
            source: WORKFLOW_IDS.OPENSPEC,
            timestamp: new Date().toISOString(),
            repositoryRoot,
          },
          findings: [
            {
              fingerprint: "js-complexity:src/feature.ts",
              analyzerId: "js-complexity",
              facetId: "js",
              severity: "warning",
              category: "complexity-threshold",
              message: "Function complexity exceeded warning threshold.",
              scope: {
                kind: "file",
                path: join(repositoryRoot, "src", "feature.ts"),
              },
            },
          ],
        },
      },
    ],
  };
}

test("buildSubagentRequest carries analyzer summary and worker write scope", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-automation-"));
  const analysisResult = createAnalysisResult(repositoryRoot);

  const request = buildSubagentRequest({
    repositoryRoot,
    event: analysisResult.event,
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["package.json"],
        metadata: {},
      },
    ],
    analysisResult,
    profile: createAutomationConfig({
      mode: "worker",
      transport: {
        kind: "sdk",
        modulePath: "./fake.js",
      },
    }),
    requestId: "request-1",
  });

  assert.equal(request.role, "worker");
  assert.equal(request.execution.constraints.writeAccess, "bounded");
  assert.deepEqual(request.execution.constraints.allowedPaths, [
    join(repositoryRoot, "src", "feature.ts"),
  ]);
  assert.equal(request.analyzerSummary.findingCount, 1);
});

test("dispatchAutomationEvent persists handoff requests and latest status", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-automation-"));
  const analysisResult = createAnalysisResult(repositoryRoot);

  const dispatch = await dispatchAutomationEvent({
    repositoryRoot,
    event: analysisResult.event,
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["package.json"],
        metadata: {},
      },
    ],
    analysisResult,
    profile: createAutomationConfig({
      invocation: "handoff",
    }),
    requestIdFactory: () => "request-2",
  });

  assert.equal(dispatch.triggered, true);
  assert.equal(dispatch.result?.verdict, "handoff");
  assert.ok(dispatch.requestPath);
  assert.ok(dispatch.resultPath);

  const request = JSON.parse(await readFile(dispatch.requestPath!, "utf8")) as { role: string };
  const result = JSON.parse(await readFile(dispatch.resultPath!, "utf8")) as { verdict: string };
  const latest = await readLatestSubagentResult(repositoryRoot, "demo-change");

  assert.equal(request.role, "advisory");
  assert.equal(result.verdict, "handoff");
  assert.equal(latest?.requestId, "request-2");
});

test("createSubagentBackend supports command, http, and sdk transports", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-automation-"));
  const request = buildSubagentRequest({
    repositoryRoot,
    event: createAnalysisResult(repositoryRoot).event,
    detectedFacets: [],
    analysisResult: createAnalysisResult(repositoryRoot),
    profile: createAutomationConfig(),
    requestId: "request-3",
  });

  const commandBackend = createSubagentBackend(repositoryRoot, {
    kind: "command",
    command: process.execPath,
    args: [
      "-e",
      "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({status:'success',verdict:'inform',summary:'command'})));",
    ],
  });
  const commandResult = await commandBackend.run(request);
  assert.equal((commandResult.payload as { summary: string }).summary, "command");

  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const parsed = JSON.parse(body) as { id: string };
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          requestId: parsed.id,
          status: "success",
          verdict: "inform",
          summary: "http",
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const httpBackend = createSubagentBackend(repositoryRoot, {
    kind: "http",
    url: `http://127.0.0.1:${address.port}/subagent`,
  });
  const httpResult = await httpBackend.run(request);
  assert.equal((httpResult.payload as { summary: string }).summary, "http");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  const modulePath = join(repositoryRoot, "subagent-sdk.mjs");
  await writeFile(
    modulePath,
    "export async function runSubagent(request) { return { requestId: request.id, status: 'success', verdict: 'inform', summary: 'sdk' }; }\n",
    "utf8",
  );
  const sdkBackend = createSubagentBackend(repositoryRoot, {
    kind: "sdk",
    modulePath,
  });
  const sdkResult = await sdkBackend.run(request);
  assert.equal((sdkResult.payload as { summary: string }).summary, "sdk");
});
