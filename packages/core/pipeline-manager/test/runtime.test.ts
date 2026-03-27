import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type {
  FeedbackNoticePayload,
  FeedbackVerdictPayload,
  ProjectContext,
} from "@spectotal/direc-artifact-contracts";
import type { FeedbackRule, FeedbackSink } from "@spectotal/direc-feedback-contracts";
import type { SourcePlugin } from "@spectotal/direc-source-contracts";
import { gitDiffSource } from "@spectotal/direc-source-git-diff";
import { openSpecSource } from "@spectotal/direc-source-openspec";
import {
  DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  repositorySource,
} from "@spectotal/direc-source-repository";
import { boundsEvaluatorNode } from "@spectotal/direc-tool-bounds-evaluator";
import { clusterBuilderNode } from "@spectotal/direc-tool-cluster-builder";
import { jsComplexityNode } from "@spectotal/direc-tool-js-complexity";
import { graphMakerNode } from "@spectotal/direc-tool-graph-maker";
import { specDocumentsNode } from "@spectotal/direc-tool-spec-documents";
import { specConflictNode } from "@spectotal/direc-tool-spec-conflict";
import {
  createCommandAnalysisNode,
  planPipelineExecution,
  readLatestRunRecord,
  runPipeline,
  watchPipeline,
  type WorkspaceConfig,
} from "../src/index.js";

const analysisThresholdRule: FeedbackRule<{ blockOnError?: boolean }> = {
  id: "analysis-thresholds",
  displayName: "Analysis Thresholds",
  defaultSelector: {
    anyOf: ["metric.complexity", "evaluation.bounds-distance", "evaluation.spec-conflict"],
  },
  async run(context) {
    let errorCount = 0;
    let warningCount = 0;

    for (const artifact of context.inputArtifacts) {
      const payload = artifact.payload as {
        errorCount?: number;
        warningCount?: number;
        conflictCount?: number;
      };
      errorCount += payload.errorCount ?? 0;
      warningCount += payload.warningCount ?? payload.conflictCount ?? 0;
    }

    const notice: FeedbackNoticePayload = {
      severity: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "info",
      summary: `errors=${errorCount}, warnings=${warningCount}`,
      counts: {
        errorCount,
        warningCount,
      },
    };
    const verdict: FeedbackVerdictPayload = {
      verdict: errorCount > 0 && (context.options.blockOnError ?? true) ? "block" : "proceed",
      summary: errorCount > 0 ? "blocking findings present" : "pipeline clear",
      counts: {
        errorCount,
        warningCount,
      },
    };

    return [
      {
        type: "feedback.notice",
        scope: {
          kind: "feedback",
        },
        payload: notice,
      },
      {
        type: "feedback.verdict",
        scope: {
          kind: "feedback",
        },
        payload: verdict,
      },
    ];
  },
};

test("runPipeline persists artifacts, latest pointers, and sink deliveries with staged fake plugins", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-pipeline-fake-"));
  const results: string[] = [];
  const projectContext: ProjectContext = {
    repositoryRoot,
    facets: [{ id: "js", evidence: ["fixture"] }],
    sourceFiles: [join(repositoryRoot, "src", "feature.ts")],
    hasGit: true,
    hasOpenSpec: false,
  };

  const fakeSource: SourcePlugin = {
    id: "fake-source",
    displayName: "Fake Source",
    seedArtifactTypes: ["source.fake"],
    detect: () => true,
    async run() {
      return [
        {
          type: "source.fake",
          scope: {
            kind: "paths",
            paths: [join(repositoryRoot, "src", "feature.ts")],
          },
          payload: {
            paths: [join(repositoryRoot, "src", "feature.ts")],
          },
        },
      ];
    },
    async watch({ onChange }) {
      const timer = setTimeout(() => {
        onChange();
      }, 20);
      return {
        close: () => {
          clearTimeout(timer);
        },
      };
    },
  };
  const fakeNode: AnalysisNode = {
    id: "fake-node",
    displayName: "Fake Node",
    stage: "extractor",
    binding: "facet-bound",
    requires: {
      anyOf: ["source.fake"],
    },
    requiredFacets: ["js"],
    produces: ["metric.complexity"],
    detect: () => true,
    async run(context) {
      return [
        {
          type: "metric.complexity",
          scope: {
            kind: "paths",
            paths: context.inputArtifacts.flatMap((artifact) => artifact.scope.paths ?? []),
          },
          payload: {
            errorCount: 1,
            warningCount: 0,
          },
        },
      ];
    },
  };
  const fakeSink: FeedbackSink = {
    id: "recording-sink",
    displayName: "Recording Sink",
    subscribedArtifactTypes: ["feedback.notice", "feedback.verdict"],
    detect: () => true,
    async deliver(context) {
      results.push(...context.artifacts.map((artifact) => artifact.type));
    },
  };
  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js"],
    sources: {
      fake: {
        id: "fake",
        plugin: "fake-source",
        enabled: true,
      },
    },
    tools: {
      fake: {
        id: "fake",
        plugin: "fake-node",
        kind: "builtin",
        enabled: true,
      },
    },
    sinks: {
      record: {
        id: "record",
        plugin: "recording-sink",
        enabled: true,
      },
    },
    pipelines: [
      {
        id: "fake-pipeline",
        source: "fake",
        analysis: {
          extractors: ["fake"],
          derivers: [],
          evaluators: [],
        },
        feedback: {
          rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
          sinks: ["record"],
        },
      },
    ],
  };

  const result = await runPipeline({
    repositoryRoot,
    config,
    registry: {
      sources: [fakeSource],
      analysisNodes: [fakeNode],
      feedbackRules: [analysisThresholdRule],
      sinks: [fakeSink],
    },
    projectContext,
    pipelineId: "fake-pipeline",
  });

  assert.equal(result.manifest.pipelineId, "fake-pipeline");
  assert.deepEqual(
    result.artifacts.map((artifact) => artifact.type),
    ["source.fake", "metric.complexity", "feedback.notice", "feedback.verdict"],
  );
  assert.deepEqual(results, ["feedback.notice", "feedback.verdict"]);
  const latest = await readLatestRunRecord(repositoryRoot, "fake-pipeline");
  assert.ok(latest);
  assert.equal(latest?.noticeCount, 1);

  const manifestDisk = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
    artifactCount: number;
  };
  assert.equal(manifestDisk.artifactCount, 4);

  await new Promise<void>(async (resolve, reject) => {
    let observed = 0;
    const watcher = await watchPipeline({
      repositoryRoot,
      config,
      registry: {
        sources: [fakeSource],
        analysisNodes: [fakeNode],
        feedbackRules: [analysisThresholdRule],
        sinks: [fakeSink],
      },
      projectContext,
      pipelineId: "fake-pipeline",
      onResult() {
        observed += 1;
        if (observed === 2) {
          watcher.close();
          resolve();
        }
      },
      onError(error) {
        reject(error);
      },
    });
  });
});

test("planPipelineExecution rejects cyclic stage graphs", async () => {
  const cycleA: AnalysisNode = {
    id: "cycle-a",
    displayName: "Cycle A",
    stage: "deriver",
    binding: "agnostic",
    requires: {
      allOf: ["analysis.b"],
    },
    produces: ["analysis.a"],
    detect: () => true,
    async run() {
      return [];
    },
  };
  const cycleB: AnalysisNode = {
    id: "cycle-b",
    displayName: "Cycle B",
    stage: "deriver",
    binding: "agnostic",
    requires: {
      allOf: ["analysis.a"],
    },
    produces: ["analysis.b"],
    detect: () => true,
    async run() {
      return [];
    },
  };

  assert.throws(
    () =>
      planPipelineExecution({
        config: {
          version: 1,
          generatedAt: new Date().toISOString(),
          facets: [],
          sources: {
            fake: {
              id: "fake",
              plugin: "fake-source",
              enabled: true,
            },
          },
          tools: {
            a: {
              id: "a",
              kind: "builtin",
              plugin: "cycle-a",
              enabled: true,
            },
            b: {
              id: "b",
              kind: "builtin",
              plugin: "cycle-b",
              enabled: true,
            },
          },
          sinks: {},
          pipelines: [
            {
              id: "cyclic",
              source: "fake",
              analysis: {
                extractors: [],
                derivers: ["a", "b"],
                evaluators: [],
              },
              feedback: {
                rules: [],
                sinks: [],
              },
            },
          ],
        },
        registry: {
          sources: [
            {
              id: "fake-source",
              displayName: "Fake Source",
              seedArtifactTypes: ["source.fake"],
              detect: () => true,
              async run() {
                return [];
              },
            },
          ],
          analysisNodes: [cycleA, cycleB],
          feedbackRules: [],
          sinks: [],
        },
        projectContext: {
          repositoryRoot: "/tmp/cycle",
          facets: [],
          sourceFiles: [],
          hasGit: false,
          hasOpenSpec: false,
        },
        pipelineId: "cyclic",
      }),
    /Cycle detected/,
  );
});

test("planPipelineExecution rejects invalid staged tool contracts", async () => {
  const sourceDependentDeriver: AnalysisNode = {
    id: "bad-deriver",
    displayName: "Bad Deriver",
    stage: "deriver",
    binding: "agnostic",
    requires: {
      allOf: ["source.fake"],
    },
    produces: ["analysis.bad"],
    detect: () => true,
    async run() {
      return [];
    },
  };
  const facetlessExtractor: AnalysisNode = {
    id: "facetless-extractor",
    displayName: "Facetless Extractor",
    stage: "extractor",
    binding: "facet-bound",
    requires: {
      anyOf: ["source.fake"],
    },
    produces: ["analysis.bad"],
    detect: () => true,
    async run() {
      return [];
    },
  };
  const facetedAgnostic: AnalysisNode = {
    id: "faceted-agnostic",
    displayName: "Faceted Agnostic",
    stage: "evaluator",
    binding: "agnostic",
    requires: {
      allOf: ["analysis.ready"],
    },
    requiredFacets: ["js"],
    produces: ["evaluation.bad"],
    detect: () => true,
    async run() {
      return [];
    },
  };

  const baseConfig: WorkspaceConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js"],
    sources: {
      fake: {
        id: "fake",
        plugin: "fake-source",
        enabled: true,
      },
    },
    tools: {},
    sinks: {},
    pipelines: [],
  };
  const baseRegistry = {
    sources: [
      {
        id: "fake-source",
        displayName: "Fake Source",
        seedArtifactTypes: ["source.fake"],
        detect: () => true,
        async run() {
          return [];
        },
      },
    ],
    analysisNodes: [] as AnalysisNode[],
    feedbackRules: [],
    sinks: [],
  };
  const projectContext: ProjectContext = {
    repositoryRoot: "/tmp/staged-contracts",
    facets: [{ id: "js", evidence: ["fixture"] }],
    sourceFiles: [],
    hasGit: false,
    hasOpenSpec: false,
  };

  assert.throws(
    () =>
      planPipelineExecution({
        config: {
          ...baseConfig,
          tools: {
            bad: {
              id: "bad",
              kind: "builtin",
              plugin: "bad-deriver",
              enabled: true,
            },
          },
          pipelines: [
            {
              id: "invalid-deriver",
              source: "fake",
              analysis: {
                extractors: [],
                derivers: ["bad"],
                evaluators: [],
              },
              feedback: {
                rules: [],
                sinks: [],
              },
            },
          ],
        },
        registry: {
          ...baseRegistry,
          analysisNodes: [sourceDependentDeriver],
        },
        projectContext,
        pipelineId: "invalid-deriver",
      }),
    /may not require source artifacts/,
  );

  assert.throws(
    () =>
      planPipelineExecution({
        config: {
          ...baseConfig,
          tools: {
            bad: {
              id: "bad",
              kind: "builtin",
              plugin: "facetless-extractor",
              enabled: true,
            },
          },
          pipelines: [
            {
              id: "facetless",
              source: "fake",
              analysis: {
                extractors: ["bad"],
                derivers: [],
                evaluators: [],
              },
              feedback: {
                rules: [],
                sinks: [],
              },
            },
          ],
        },
        registry: {
          ...baseRegistry,
          analysisNodes: [facetlessExtractor],
        },
        projectContext,
        pipelineId: "facetless",
      }),
    /must declare requiredFacets/,
  );

  assert.throws(
    () =>
      planPipelineExecution({
        config: {
          ...baseConfig,
          tools: {
            bad: {
              id: "bad",
              kind: "builtin",
              plugin: "faceted-agnostic",
              enabled: true,
            },
          },
          pipelines: [
            {
              id: "faceted-agnostic",
              source: "fake",
              analysis: {
                extractors: [],
                derivers: [],
                evaluators: ["bad"],
              },
              feedback: {
                rules: [],
                sinks: [],
              },
            },
          ],
        },
        registry: {
          ...baseRegistry,
          analysisNodes: [facetedAgnostic],
        },
        projectContext,
        pipelineId: "faceted-agnostic",
      }),
    /may not declare requiredFacets/,
  );
});

test("planPipelineExecution rejects missing upstream artifact producers", async () => {
  assert.throws(
    () =>
      planPipelineExecution({
        config: {
          version: 1,
          generatedAt: new Date().toISOString(),
          facets: ["js"],
          sources: {
            fake: {
              id: "fake",
              plugin: "fake-source",
              enabled: true,
            },
          },
          tools: {
            bounds: {
              id: "bounds",
              kind: "builtin",
              plugin: "bounds-evaluator",
              enabled: true,
            },
          },
          sinks: {},
          pipelines: [
            {
              id: "missing-upstream",
              source: "fake",
              analysis: {
                extractors: [],
                derivers: [],
                evaluators: ["bounds"],
              },
              feedback: {
                rules: [],
                sinks: [],
              },
            },
          ],
        },
        registry: {
          sources: [
            {
              id: "fake-source",
              displayName: "Fake Source",
              seedArtifactTypes: ["source.fake"],
              detect: () => true,
              async run() {
                return [];
              },
            },
          ],
          analysisNodes: [boundsEvaluatorNode],
          feedbackRules: [],
          sinks: [],
        },
        projectContext: {
          repositoryRoot: "/tmp/missing-upstream",
          facets: [{ id: "js", evidence: ["fixture"] }],
          sourceFiles: [],
          hasGit: false,
          hasOpenSpec: false,
        },
        pipelineId: "missing-upstream",
      }),
    /unsatisfied inputs/,
  );
});

test("createCommandAnalysisNode normalises command-backed tool output", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-command-node-"));
  const node = createCommandAnalysisNode({
    id: "cmd",
    kind: "command",
    enabled: true,
    stage: "extractor",
    binding: "facet-bound",
    requires: {
      anyOf: ["source.fake"],
    },
    requiredFacets: ["fixture"],
    produces: ["analysis.command"],
    command: {
      command: process.execPath,
      args: [
        "-e",
        "let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify({artifacts:[{type:'analysis.command',scope:{kind:'repository'},payload:{ok:true}}]})));",
      ],
    },
  });

  const outputs = await node.run({
    repositoryRoot,
    runId: "run-1",
    pipelineId: "pipeline",
    sourceId: "fake",
    toolConfig: {
      id: "cmd",
      kind: "command",
      enabled: true,
      stage: "extractor",
      binding: "facet-bound",
      requires: {
        anyOf: ["source.fake"],
      },
      requiredFacets: ["fixture"],
      produces: ["analysis.command"],
      command: {
        command: process.execPath,
      },
    },
    projectContext: {
      repositoryRoot,
      facets: [],
      sourceFiles: [],
      hasGit: false,
      hasOpenSpec: false,
    },
    inputArtifacts: [
      {
        id: "seed-1",
        type: "source.fake",
        producerId: "fake-source",
        runId: "run-1",
        pipelineId: "pipeline",
        sourceId: "fake",
        scope: {
          kind: "repository",
        },
        inputArtifactIds: [],
        timestamp: new Date().toISOString(),
        payloadPath: "artifacts/seed-1.json",
        payload: {},
      },
    ],
    options: {},
    now: () => new Date(),
  });

  assert.equal(outputs[0]?.type, "analysis.command");
});

test("runPipeline executes the diff slice end to end with staged analysis", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-diff-slice-"));
  await mkdir(join(repositoryRoot, "packages", "app", "src"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "packages", "app", "src", "index.ts"),
    "import { helper } from './helper.js';\nexport function run(input: number) { if (input > 1 && helper()) { return input; } return 0; }\n",
  );
  await writeFile(
    join(repositoryRoot, "packages", "app", "src", "helper.ts"),
    "export function helper() { return true; }\n",
  );
  await git(repositoryRoot, ["init"]);
  await git(repositoryRoot, ["config", "user.email", "direc@example.com"]);
  await git(repositoryRoot, ["config", "user.name", "Direc"]);
  await git(repositoryRoot, ["add", "."]);
  await git(repositoryRoot, ["commit", "-m", "init"]);
  await writeFile(
    join(repositoryRoot, "packages", "app", "src", "index.ts"),
    "import { helper } from './helper.js';\nexport function run(input: number) { if (input > 1 && helper()) { return input; } if (input > 5) { return input + 1; } return 0; }\n",
  );

  const delivered: string[] = [];
  const recordingSink: FeedbackSink = {
    id: "recording-sink",
    displayName: "Recording Sink",
    subscribedArtifactTypes: ["feedback.notice", "feedback.verdict"],
    detect: () => true,
    async deliver(context) {
      delivered.push(...context.artifacts.map((artifact) => artifact.type));
    },
  };
  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js"],
    sources: {
      diff: {
        id: "diff",
        plugin: "git-diff",
        enabled: true,
      },
    },
    tools: {
      jsComplexity: {
        id: "jsComplexity",
        kind: "builtin",
        plugin: "js-complexity",
        enabled: true,
      },
      graph: {
        id: "graph",
        kind: "builtin",
        plugin: "graph-maker",
        enabled: true,
      },
      cluster: {
        id: "cluster",
        kind: "builtin",
        plugin: "cluster-builder",
        enabled: true,
      },
      bounds: {
        id: "bounds",
        kind: "builtin",
        plugin: "bounds-evaluator",
        enabled: true,
      },
    },
    sinks: {
      record: {
        id: "record",
        plugin: "recording-sink",
        enabled: true,
      },
    },
    pipelines: [
      {
        id: "diff-quality",
        source: "diff",
        analysis: {
          extractors: ["jsComplexity", "graph"],
          derivers: ["cluster"],
          evaluators: ["bounds"],
        },
        feedback: {
          rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
          sinks: ["record"],
        },
      },
    ],
  };

  const result = await runPipeline({
    repositoryRoot,
    config,
    registry: {
      sources: [gitDiffSource],
      analysisNodes: [jsComplexityNode, graphMakerNode, clusterBuilderNode, boundsEvaluatorNode],
      feedbackRules: [analysisThresholdRule],
      sinks: [recordingSink],
    },
    projectContext: {
      repositoryRoot,
      facets: [{ id: "js", evidence: ["fixture"] }],
      sourceFiles: [
        join(repositoryRoot, "packages", "app", "src", "index.ts"),
        join(repositoryRoot, "packages", "app", "src", "helper.ts"),
      ],
      hasGit: true,
      hasOpenSpec: false,
    },
    pipelineId: "diff-quality",
  });

  const types = result.artifacts.map((artifact) => artifact.type);
  assert.ok(types.includes("source.diff.scope"));
  assert.ok(types.includes("metric.complexity"));
  assert.ok(types.includes("structural.graph"));
  assert.ok(types.includes("structural.cluster"));
  assert.ok(types.includes("structural.roles"));
  assert.ok(types.includes("structural.boundaries"));
  assert.ok(types.includes("evaluation.bounds-distance"));
  assert.ok(types.includes("feedback.verdict"));
  assert.deepEqual(delivered, ["feedback.notice", "feedback.verdict"]);
});

test("runPipeline executes the repository slice end to end with source-level exclusions", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-repository-slice-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await mkdir(join(repositoryRoot, "test"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "src", "index.ts"),
    "import { helper } from './helper.js';\nexport function run(input: number) { if (input > 1 && helper()) { return input; } return 0; }\n",
  );
  await writeFile(
    join(repositoryRoot, "src", "helper.ts"),
    "export function helper() { return true; }\n",
  );
  await writeFile(
    join(repositoryRoot, "test", "ignored.ts"),
    "export function ignored() { return false; }\n",
  );

  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js"],
    sources: {
      repository: {
        id: "repository",
        plugin: "repository",
        enabled: true,
        options: {
          excludePaths: [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS],
        },
      },
    },
    tools: {
      jsComplexity: {
        id: "jsComplexity",
        kind: "builtin",
        plugin: "js-complexity",
        enabled: true,
      },
      graph: {
        id: "graph",
        kind: "builtin",
        plugin: "graph-maker",
        enabled: true,
      },
      cluster: {
        id: "cluster",
        kind: "builtin",
        plugin: "cluster-builder",
        enabled: true,
      },
      bounds: {
        id: "bounds",
        kind: "builtin",
        plugin: "bounds-evaluator",
        enabled: true,
      },
    },
    sinks: {},
    pipelines: [
      {
        id: "repository-quality",
        source: "repository",
        analysis: {
          extractors: ["jsComplexity", "graph"],
          derivers: ["cluster"],
          evaluators: ["bounds"],
        },
        feedback: {
          rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
          sinks: [],
        },
      },
    ],
  };

  const result = await runPipeline({
    repositoryRoot,
    config,
    registry: {
      sources: [repositorySource],
      analysisNodes: [jsComplexityNode, graphMakerNode, clusterBuilderNode, boundsEvaluatorNode],
      feedbackRules: [analysisThresholdRule],
      sinks: [],
    },
    projectContext: {
      repositoryRoot,
      facets: [{ id: "js", evidence: ["fixture"] }],
      sourceFiles: [
        join(repositoryRoot, "src", "index.ts"),
        join(repositoryRoot, "src", "helper.ts"),
        join(repositoryRoot, "test", "ignored.ts"),
      ],
      hasGit: false,
      hasOpenSpec: false,
    },
    pipelineId: "repository-quality",
  });

  const sourceArtifact = result.artifacts.find(
    (artifact) => artifact.type === "source.repository.scope",
  );
  assert.ok(sourceArtifact);
  assert.deepEqual(sourceArtifact?.scope.paths, [
    join(repositoryRoot, "src", "helper.ts"),
    join(repositoryRoot, "src", "index.ts"),
  ]);
  assert.ok(result.artifacts.some((artifact) => artifact.type === "metric.complexity"));
  assert.ok(result.artifacts.some((artifact) => artifact.type === "structural.graph"));
  assert.ok(result.artifacts.some((artifact) => artifact.type === "evaluation.bounds-distance"));
  assert.ok(result.artifacts.some((artifact) => artifact.type === "feedback.verdict"));
});

test("runPipeline executes openspec task and spec pipelines against the same manager", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-openspec-slice-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await mkdir(join(repositoryRoot, "openspec", "changes", "alpha", "specs", "demo"), {
    recursive: true,
  });
  await mkdir(join(repositoryRoot, "openspec", "specs", "demo"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "src", "feature.ts"),
    "export function feature(v:number){ if (v > 2) { return v; } return 0; }\n",
  );
  await writeFile(
    join(repositoryRoot, "openspec", "changes", "alpha", "tasks.md"),
    "- [x] 1.1 Implement slice\n- [ ] 1.2 Follow up\n",
  );
  await writeFile(
    join(repositoryRoot, "openspec", "changes", "alpha", "specs", "demo", "spec.md"),
    "# Demo\n\nThe implementation MUST validate pipeline artifacts.\n",
  );
  await writeFile(
    join(repositoryRoot, "openspec", "specs", "demo", "spec.md"),
    "# Demo\n\nThe implementation MUST preserve the previous runtime layout.\n",
  );

  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    facets: ["js", "openspec"],
    sources: {
      openspecTasks: {
        id: "openspecTasks",
        plugin: "openspec",
        enabled: true,
        options: {
          mode: "tasks",
        },
      },
      openspecSpecs: {
        id: "openspecSpecs",
        plugin: "openspec",
        enabled: true,
        options: {
          mode: "spec-change",
        },
      },
    },
    tools: {
      jsComplexity: {
        id: "jsComplexity",
        kind: "builtin",
        plugin: "js-complexity",
        enabled: true,
      },
      graph: {
        id: "graph",
        kind: "builtin",
        plugin: "graph-maker",
        enabled: true,
      },
      cluster: {
        id: "cluster",
        kind: "builtin",
        plugin: "cluster-builder",
        enabled: true,
      },
      bounds: {
        id: "bounds",
        kind: "builtin",
        plugin: "bounds-evaluator",
        enabled: true,
      },
      specDocuments: {
        id: "specDocuments",
        kind: "builtin",
        plugin: "spec-documents",
        enabled: true,
      },
      specConflict: {
        id: "specConflict",
        kind: "builtin",
        plugin: "spec-conflict",
        enabled: true,
      },
    },
    sinks: {},
    pipelines: [
      {
        id: "openspec-task-feedback",
        source: "openspecTasks",
        analysis: {
          extractors: ["jsComplexity", "graph"],
          derivers: ["cluster"],
          evaluators: ["bounds"],
        },
        feedback: {
          rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
          sinks: [],
        },
      },
      {
        id: "openspec-spec-conflicts",
        source: "openspecSpecs",
        analysis: {
          extractors: ["specDocuments"],
          derivers: [],
          evaluators: ["specConflict"],
        },
        feedback: {
          rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
          sinks: [],
        },
      },
    ],
  };
  const registry = {
    sources: [openSpecSource],
    analysisNodes: [
      jsComplexityNode,
      graphMakerNode,
      clusterBuilderNode,
      boundsEvaluatorNode,
      specDocumentsNode,
      specConflictNode,
    ],
    feedbackRules: [analysisThresholdRule],
    sinks: [],
  };
  const projectContext: ProjectContext = {
    repositoryRoot,
    facets: [
      { id: "js", evidence: ["fixture"] },
      { id: "openspec", evidence: ["fixture"] },
    ],
    sourceFiles: [join(repositoryRoot, "src", "feature.ts")],
    hasGit: false,
    hasOpenSpec: true,
  };

  const taskResult = await runPipeline({
    repositoryRoot,
    config,
    registry,
    projectContext,
    pipelineId: "openspec-task-feedback",
  });
  const specResult = await runPipeline({
    repositoryRoot,
    config,
    registry,
    projectContext,
    pipelineId: "openspec-spec-conflicts",
  });

  assert.ok(taskResult.artifacts.some((artifact) => artifact.type === "source.openspec.task"));
  assert.ok(
    taskResult.artifacts.some((artifact) => artifact.type === "evaluation.bounds-distance"),
  );
  assert.ok(
    specResult.artifacts.some((artifact) => artifact.type === "source.openspec.spec-change"),
  );
  assert.ok(
    specResult.artifacts.some((artifact) => artifact.type === "analysis.spec-document-pair"),
  );
  assert.ok(specResult.artifacts.some((artifact) => artifact.type === "evaluation.spec-conflict"));
  const conflict = specResult.artifacts.find(
    (artifact) => artifact.type === "evaluation.spec-conflict",
  );
  assert.equal((conflict?.payload as { conflictCount?: number })?.conflictCount, 1);
});

async function git(repositoryRoot: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`git ${args.join(" ")} failed with code ${code ?? -1}`));
    });
  });
}
