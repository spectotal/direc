import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import type {
  AnalysisNode,
  CommandToolConfig,
  ToolConfig,
} from "@spectotal/direc-analysis-contracts";
import type {
  ArtifactEnvelope,
  ArtifactSeed,
  FeedbackNoticePayload,
  FeedbackVerdictPayload,
  ProjectContext,
} from "@spectotal/direc-artifact-contracts";
import { satisfiesSelector, selectArtifactsByType } from "@spectotal/direc-artifact-contracts";
import type {
  FeedbackRule,
  FeedbackRuleDefinition,
  FeedbackSink,
  SinkConfig,
} from "@spectotal/direc-feedback-contracts";
import type { SourceConfig, SourcePlugin } from "@spectotal/direc-source-contracts";

export interface PipelineDefinition {
  id: string;
  description?: string;
  source: string;
  tools: string[];
  rules: FeedbackRuleDefinition[];
  sinks: string[];
}

export interface WorkspaceConfig {
  version: 1;
  generatedAt: string;
  facets: string[];
  sources: Record<string, SourceConfig>;
  tools: Record<string, ToolConfig>;
  sinks: Record<string, SinkConfig>;
  pipelines: PipelineDefinition[];
}

export interface PipelineRegistry {
  sources: SourcePlugin[];
  analysisNodes: AnalysisNode[];
  feedbackRules: FeedbackRule[];
  sinks: FeedbackSink[];
}

export interface PipelinePlan {
  pipeline: PipelineDefinition;
  sourceConfig: SourceConfig;
  sourcePlugin: SourcePlugin;
  tools: Array<{
    config: ToolConfig;
    node: AnalysisNode;
  }>;
  rules: Array<{
    definition: FeedbackRuleDefinition;
    rule: FeedbackRule;
  }>;
  sinks: Array<{
    config: SinkConfig;
    sink: FeedbackSink;
  }>;
}

export interface SinkDeliveryRecord {
  sinkId: string;
  artifactIds: string[];
  deliveredAt: string;
}

export interface RunManifest {
  runId: string;
  pipelineId: string;
  sourceId: string;
  startedAt: string;
  finishedAt: string;
  artifactCount: number;
  artifacts: Array<Omit<ArtifactEnvelope, "payload">>;
  deliveries: SinkDeliveryRecord[];
}

export interface LatestRunRecord {
  pipelineId: string;
  runId: string;
  manifestPath: string;
  updatedAt: string;
  noticeCount: number;
  verdicts: FeedbackVerdictPayload[];
}

export interface PipelineRunResult {
  manifest: RunManifest;
  manifestPath: string;
  latestPath: string;
  artifacts: ArtifactEnvelope[];
  deliveries: SinkDeliveryRecord[];
}

export interface RunPipelineOptions {
  repositoryRoot: string;
  config: WorkspaceConfig;
  registry: PipelineRegistry;
  projectContext: ProjectContext;
  pipelineId: string;
  now?: () => Date;
}

export interface WatchPipelineOptions extends RunPipelineOptions {
  onResult?: (result: PipelineRunResult) => void;
  onError?: (error: Error) => void;
}

const DIREC_DIR = ".direc";

export async function ensureDirecLayout(repositoryRoot: string): Promise<void> {
  await Promise.all([
    ensureDirectory(join(repositoryRoot, DIREC_DIR)),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "runs")),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "latest")),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "cache")),
  ]);
}

export async function writeWorkspaceConfig(
  repositoryRoot: string,
  config: WorkspaceConfig,
): Promise<string> {
  await ensureDirecLayout(repositoryRoot);
  const configPath = join(repositoryRoot, DIREC_DIR, "config.json");
  await writeJsonFile(configPath, config);
  return configPath;
}

export async function readWorkspaceConfig(repositoryRoot: string): Promise<WorkspaceConfig> {
  const configPath = join(repositoryRoot, DIREC_DIR, "config.json");
  return readJsonFile<WorkspaceConfig>(configPath);
}

export async function readLatestRunRecord(
  repositoryRoot: string,
  pipelineId: string,
): Promise<LatestRunRecord | null> {
  const latestPath = join(
    repositoryRoot,
    DIREC_DIR,
    "latest",
    `${sanitiseSegment(pipelineId)}.json`,
  );

  try {
    return await readJsonFile<LatestRunRecord>(latestPath);
  } catch {
    return null;
  }
}

export function planPipelineExecution(options: {
  config: WorkspaceConfig;
  registry: PipelineRegistry;
  projectContext: ProjectContext;
  pipelineId: string;
}): PipelinePlan {
  const sourceMap = mapById(options.registry.sources);
  const nodeMap = mapById(options.registry.analysisNodes);
  const ruleMap = mapById(options.registry.feedbackRules);
  const sinkMap = mapById(options.registry.sinks);
  const pipeline = options.config.pipelines.find((entry) => entry.id === options.pipelineId);

  if (!pipeline) {
    throw new Error(`Unknown pipeline: ${options.pipelineId}`);
  }

  const sourceConfig = options.config.sources[pipeline.source];
  if (!sourceConfig || !sourceConfig.enabled) {
    throw new Error(
      `Pipeline ${pipeline.id} references disabled or missing source ${pipeline.source}.`,
    );
  }

  const sourcePlugin = sourceMap.get(sourceConfig.plugin);
  if (!sourcePlugin) {
    throw new Error(`No source plugin registered for ${sourceConfig.plugin}.`);
  }
  if (!sourcePlugin.detect(options.projectContext)) {
    throw new Error(`Source plugin ${sourceConfig.plugin} is not applicable in this repository.`);
  }

  const tools = pipeline.tools
    .map((toolId) => {
      const config = options.config.tools[toolId];
      if (!config || !config.enabled) {
        return null;
      }

      if (config.kind === "command") {
        return {
          config,
          node: createCommandAnalysisNode(config),
        };
      }

      const plugin = nodeMap.get(config.plugin);
      if (!plugin) {
        throw new Error(`No analysis node registered for ${config.plugin}.`);
      }
      if (!plugin.detect(options.projectContext)) {
        return null;
      }

      return {
        config,
        node: plugin,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const orderedTools = topologicallySortTools(tools);

  const rules = pipeline.rules.map((definition) => {
    const rule = ruleMap.get(definition.plugin);
    if (!rule) {
      throw new Error(`No feedback rule registered for ${definition.plugin}.`);
    }

    return {
      definition,
      rule,
    };
  });

  const sinks = pipeline.sinks
    .map((sinkId) => {
      const config = options.config.sinks[sinkId];
      if (!config || !config.enabled) {
        return null;
      }

      const sink = sinkMap.get(config.plugin);
      if (!sink) {
        throw new Error(`No feedback sink registered for ${config.plugin}.`);
      }
      if (!sink.detect(options.projectContext)) {
        return null;
      }

      return {
        config,
        sink,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    pipeline,
    sourceConfig,
    sourcePlugin,
    tools: orderedTools,
    rules,
    sinks,
  };
}

export async function runPipeline(options: RunPipelineOptions): Promise<PipelineRunResult> {
  await ensureDirecLayout(options.repositoryRoot);
  const now = options.now ?? (() => new Date());
  const plan = planPipelineExecution(options);
  const runId = createRunId(now);
  const startedAt = now().toISOString();
  const artifacts: ArtifactEnvelope[] = [];

  const sourceSeeds = await plan.sourcePlugin.run({
    repositoryRoot: options.repositoryRoot,
    pipelineId: plan.pipeline.id,
    sourceConfig: plan.sourceConfig,
    projectContext: options.projectContext,
    now,
  });

  artifacts.push(
    ...(await persistArtifactSeeds({
      repositoryRoot: options.repositoryRoot,
      runId,
      pipelineId: plan.pipeline.id,
      sourceId: plan.sourceConfig.id,
      producerId: plan.sourcePlugin.id,
      seeds: sourceSeeds,
      inputArtifactIds: [],
      now,
    })),
  );

  for (const step of plan.tools) {
    const inputArtifacts = filterArtifactsForSelector(artifacts, step.node.selector);
    if (!satisfiesSelector(inputArtifacts, step.node.selector)) {
      continue;
    }

    const context = {
      repositoryRoot: options.repositoryRoot,
      runId,
      pipelineId: plan.pipeline.id,
      sourceId: plan.sourceConfig.id,
      toolConfig: step.config,
      projectContext: options.projectContext,
      inputArtifacts,
      options: extractOptions(step.config),
      now,
    };

    if (step.node.isApplicable && !step.node.isApplicable(context)) {
      continue;
    }

    const outputSeeds = await step.node.run(context);
    artifacts.push(
      ...(await persistArtifactSeeds({
        repositoryRoot: options.repositoryRoot,
        runId,
        pipelineId: plan.pipeline.id,
        sourceId: plan.sourceConfig.id,
        producerId: step.node.id,
        seeds: outputSeeds,
        inputArtifactIds: inputArtifacts.map((artifact) => artifact.id),
        now,
      })),
    );
  }

  for (const entry of plan.rules) {
    const selector = entry.definition.selector ?? entry.rule.defaultSelector;
    const inputArtifacts = filterArtifactsForSelector(artifacts, selector);
    if (!satisfiesSelector(inputArtifacts, selector)) {
      continue;
    }

    const outputSeeds = await entry.rule.run({
      repositoryRoot: options.repositoryRoot,
      runId,
      pipelineId: plan.pipeline.id,
      sourceId: plan.sourceConfig.id,
      rule: entry.definition,
      projectContext: options.projectContext,
      inputArtifacts,
      options: entry.definition.options ?? {},
      now,
    });

    artifacts.push(
      ...(await persistArtifactSeeds({
        repositoryRoot: options.repositoryRoot,
        runId,
        pipelineId: plan.pipeline.id,
        sourceId: plan.sourceConfig.id,
        producerId: entry.rule.id,
        seeds: outputSeeds,
        inputArtifactIds: inputArtifacts.map((artifact) => artifact.id),
        now,
      })),
    );
  }

  const deliveries: SinkDeliveryRecord[] = [];
  for (const entry of plan.sinks) {
    const subscribedArtifacts = selectArtifactsByType(
      artifacts,
      entry.sink.subscribedArtifactTypes,
    );

    if (subscribedArtifacts.length === 0) {
      continue;
    }

    await entry.sink.deliver({
      repositoryRoot: options.repositoryRoot,
      runId,
      pipelineId: plan.pipeline.id,
      sourceId: plan.sourceConfig.id,
      sinkConfig: entry.config,
      projectContext: options.projectContext,
      artifacts: subscribedArtifacts,
      now,
    });

    deliveries.push({
      sinkId: entry.config.id,
      artifactIds: subscribedArtifacts.map((artifact) => artifact.id),
      deliveredAt: now().toISOString(),
    });
  }

  const finishedAt = now().toISOString();
  const manifest: RunManifest = {
    runId,
    pipelineId: plan.pipeline.id,
    sourceId: plan.sourceConfig.id,
    startedAt,
    finishedAt,
    artifactCount: artifacts.length,
    artifacts: artifacts.map(stripPayload),
    deliveries,
  };

  const runDirectory = join(options.repositoryRoot, DIREC_DIR, "runs", runId);
  const manifestPath = join(runDirectory, "manifest.json");
  await writeJsonFile(manifestPath, manifest);

  const latestRecord: LatestRunRecord = {
    pipelineId: plan.pipeline.id,
    runId,
    manifestPath,
    updatedAt: finishedAt,
    noticeCount: selectArtifactsByType<FeedbackNoticePayload>(artifacts, ["feedback.notice"])
      .length,
    verdicts: selectArtifactsByType<FeedbackVerdictPayload>(artifacts, ["feedback.verdict"]).map(
      (artifact) => artifact.payload,
    ),
  };
  const latestPath = join(
    options.repositoryRoot,
    DIREC_DIR,
    "latest",
    `${sanitiseSegment(plan.pipeline.id)}.json`,
  );
  await writeJsonFile(latestPath, latestRecord);

  return {
    manifest,
    manifestPath,
    latestPath,
    artifacts,
    deliveries,
  };
}

export async function watchPipeline(options: WatchPipelineOptions): Promise<{ close: () => void }> {
  const plan = planPipelineExecution(options);
  const onResult = options.onResult ?? (() => undefined);
  const onError = options.onError ?? (() => undefined);
  let queue = Promise.resolve();
  let closed = false;

  onResult(await runPipeline(options));

  if (!plan.sourcePlugin.watch) {
    throw new Error(`Source ${plan.sourcePlugin.id} does not support watch mode.`);
  }

  const handle = await plan.sourcePlugin.watch({
    repositoryRoot: options.repositoryRoot,
    pipelineId: plan.pipeline.id,
    sourceConfig: plan.sourceConfig,
    projectContext: options.projectContext,
    now: options.now ?? (() => new Date()),
    onChange: () => {
      if (closed) {
        return;
      }

      queue = queue.then(async () => {
        try {
          onResult(await runPipeline(options));
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
  });

  return {
    close: () => {
      closed = true;
      handle.close();
    },
  };
}

export function createCommandAnalysisNode(config: CommandToolConfig): AnalysisNode {
  return {
    id: `command:${config.id}`,
    displayName: `Command ${config.id}`,
    selector: config.selector,
    produces: config.produces,
    detect: () => true,
    async run(context) {
      const payload = await runCommandNode(config, context.repositoryRoot, {
        runId: context.runId,
        pipelineId: context.pipelineId,
        sourceId: context.sourceId,
        options: context.options,
        inputArtifacts: context.inputArtifacts,
      });

      if (
        !payload ||
        typeof payload !== "object" ||
        !("artifacts" in payload) ||
        !Array.isArray((payload as { artifacts?: unknown }).artifacts)
      ) {
        throw new Error(`Command node ${config.id} did not return an artifacts array.`);
      }

      return (payload as { artifacts: ArtifactSeed[] }).artifacts.map((artifact) => {
        if (!config.produces.includes(artifact.type)) {
          throw new Error(
            `Command node ${config.id} produced unexpected artifact type ${artifact.type}.`,
          );
        }
        return artifact;
      });
    },
  };
}

function filterArtifactsForSelector(
  artifacts: ArtifactEnvelope[],
  selector: { allOf?: string[]; anyOf?: string[] },
): ArtifactEnvelope[] {
  const wanted = new Set([...(selector.allOf ?? []), ...(selector.anyOf ?? [])]);
  return artifacts.filter((artifact) => wanted.has(artifact.type));
}

function topologicallySortTools(
  tools: Array<{
    config: ToolConfig;
    node: AnalysisNode;
  }>,
): Array<{
  config: ToolConfig;
  node: AnalysisNode;
}> {
  const producerIdsByType = new Map<string, string[]>();
  const toolMap = new Map<string, { config: ToolConfig; node: AnalysisNode }>();

  for (const step of tools) {
    toolMap.set(step.config.id, step);
    for (const type of step.node.produces) {
      const current = producerIdsByType.get(type) ?? [];
      current.push(step.config.id);
      producerIdsByType.set(type, current);
    }
  }

  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const step of tools) {
    dependencies.set(step.config.id, new Set());
    dependents.set(step.config.id, new Set());
  }

  for (const step of tools) {
    const types = new Set([
      ...(step.node.selector.allOf ?? []),
      ...(step.node.selector.anyOf ?? []),
    ]);
    for (const type of types) {
      for (const producerId of producerIdsByType.get(type) ?? []) {
        if (producerId === step.config.id) {
          continue;
        }

        dependencies.get(step.config.id)?.add(producerId);
        dependents.get(producerId)?.add(step.config.id);
      }
    }
  }

  const ready = [...dependencies.entries()]
    .filter(([, deps]) => deps.size === 0)
    .map(([id]) => id)
    .sort();
  const ordered: Array<{ config: ToolConfig; node: AnalysisNode }> = [];

  while (ready.length > 0) {
    const id = ready.shift();
    if (!id) {
      break;
    }

    const step = toolMap.get(id);
    if (!step) {
      continue;
    }

    ordered.push(step);

    for (const dependent of dependents.get(id) ?? []) {
      const remaining = dependencies.get(dependent);
      remaining?.delete(id);
      if (remaining && remaining.size === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }

  if (ordered.length !== tools.length) {
    const unresolved = [...dependencies.entries()]
      .filter(([, deps]) => deps.size > 0)
      .map(([id]) => id)
      .sort();
    throw new Error(`Cycle detected between analysis nodes: ${unresolved.join(", ")}`);
  }

  return ordered;
}

async function persistArtifactSeeds(options: {
  repositoryRoot: string;
  runId: string;
  pipelineId: string;
  sourceId: string;
  producerId: string;
  seeds: ArtifactSeed[];
  inputArtifactIds: string[];
  now: () => Date;
}): Promise<ArtifactEnvelope[]> {
  const runDirectory = join(options.repositoryRoot, DIREC_DIR, "runs", options.runId);
  const artifactDirectory = join(runDirectory, "artifacts");
  await ensureDirectory(artifactDirectory);

  const persisted: ArtifactEnvelope[] = [];

  for (const seed of options.seeds) {
    const id = `${sanitiseSegment(seed.type)}-${randomUUID()}`;
    const payloadPath = join("artifacts", `${id}.json`);
    const envelope: ArtifactEnvelope = {
      id,
      type: seed.type,
      producerId: options.producerId,
      runId: options.runId,
      pipelineId: options.pipelineId,
      sourceId: options.sourceId,
      scope: seed.scope,
      inputArtifactIds: options.inputArtifactIds,
      timestamp: options.now().toISOString(),
      payloadPath,
      payload: seed.payload,
      metadata: seed.metadata,
    };
    await writeJsonFile(join(runDirectory, payloadPath), seed.payload);
    persisted.push(envelope);
  }

  return persisted;
}

async function runCommandNode(
  config: CommandToolConfig,
  repositoryRoot: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const cwd = config.command.cwd ? resolve(repositoryRoot, config.command.cwd) : repositoryRoot;
  const child = spawn(config.command.command, config.command.args ?? [], {
    cwd,
    env: {
      ...process.env,
      ...config.command.env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  return await new Promise<unknown>((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Command node ${config.id} timed out.`));
    }, config.command.timeoutMs ?? 30_000);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr || `Command node ${config.id} exited with code ${code ?? -1}.`));
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout || "{}"));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error(`Command node ${config.id} produced invalid JSON.`),
        );
      }
    });

    child.stdin.end(JSON.stringify(input));
  });
}

function extractOptions(config: ToolConfig): Record<string, unknown> {
  return config.options ?? {};
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await ensureDirectory(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function mapById<T extends { id: string }>(entries: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    map.set(entry.id, entry);
  }
  return map;
}

function stripPayload(artifact: ArtifactEnvelope): Omit<ArtifactEnvelope, "payload"> {
  const clone = { ...artifact };
  delete clone.payload;
  return clone;
}

function createRunId(now: () => Date): string {
  return `${now().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID()}`;
}

function sanitiseSegment(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "_");
}
