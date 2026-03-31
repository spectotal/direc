import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import type {
  AnalysisBinding,
  AnalysisNode,
  CommandToolConfig,
  ToolConfig,
} from "@spectotal/direc-analysis-contracts";
import type {
  ArtifactEnvelope,
  ArtifactSeed,
  ArtifactSelector,
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

export interface PipelineAnalysisDefinition {
  facet: string[];
  agnostic: string[];
}

export interface PipelineFeedbackDefinition {
  rules: FeedbackRuleDefinition[];
  sinks: string[];
}

export interface PipelineDefinition {
  id: string;
  description?: string;
  source: string;
  analysis: PipelineAnalysisDefinition;
  feedback: PipelineFeedbackDefinition;
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

export interface ResolvedAnalysisStep {
  config: ToolConfig;
  node: AnalysisNode;
}

export interface PipelinePlan {
  pipeline: PipelineDefinition;
  sourceConfig: SourceConfig;
  sourcePlugin: SourcePlugin;
  analysis: Record<AnalysisBinding, ResolvedAnalysisStep[]>;
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
  artifacts: ArtifactEnvelope[];
  deliveries: SinkDeliveryRecord[];
}

export type LatestRunRecord = RunManifest;

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
const ANALYSIS_BINDINGS: AnalysisBinding[] = ["facet", "agnostic"];

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
    sanitiseSegment(pipelineId),
    "manifest.json",
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

  const sourceArtifactTypes = new Set(sourcePlugin.seedArtifactTypes);
  const availableArtifactTypes = new Set(sourceArtifactTypes);
  const analysis: Record<AnalysisBinding, ResolvedAnalysisStep[]> = {
    facet: resolveFacetTools({
      toolIds: pipeline.analysis.facet,
      config: options.config,
      nodeMap,
      projectContext: options.projectContext,
      sourceArtifactTypes,
    }),
    agnostic: [],
  };
  for (const step of analysis.facet) {
    for (const type of step.node.produces) {
      availableArtifactTypes.add(type);
    }
  }
  analysis.agnostic = resolveAgnosticTools({
    toolIds: pipeline.analysis.agnostic,
    config: options.config,
    nodeMap,
    projectContext: options.projectContext,
    availableArtifactTypes,
  });

  const rules = pipeline.feedback.rules.map((definition) => {
    const rule = ruleMap.get(definition.plugin);
    if (!rule) {
      throw new Error(`No feedback rule registered for ${definition.plugin}.`);
    }

    const selector = definition.selector ?? rule.defaultSelector;
    if (collectSelectorTypes(selector).some(isSourceArtifactType)) {
      throw new Error(`Feedback rule ${definition.id} may not consume source artifacts.`);
    }

    return {
      definition,
      rule,
    };
  });

  const sinks = pipeline.feedback.sinks
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
    analysis,
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

  for (const binding of ANALYSIS_BINDINGS) {
    for (const step of plan.analysis[binding]) {
      const inputArtifacts = filterArtifactsForAnalysisStep(artifacts, step.node);
      if (!satisfiesSelector(inputArtifacts, step.node.requires)) {
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
    artifacts,
    deliveries,
  };

  const runDirectory = join(options.repositoryRoot, DIREC_DIR, "runs", runId);
  const manifestPath = join(runDirectory, "manifest.json");
  await writeJsonFile(manifestPath, manifest);

  const latestPath = join(
    options.repositoryRoot,
    DIREC_DIR,
    "latest",
    sanitiseSegment(plan.pipeline.id),
    "manifest.json",
  );
  await writeLatestRunSnapshot({
    repositoryRoot: options.repositoryRoot,
    pipelineId: plan.pipeline.id,
    manifest,
  });

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
    binding: config.binding,
    requires: config.requires,
    optionalInputs: config.optionalInputs,
    requiredFacets: config.requiredFacets,
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

function resolveFacetTools(options: {
  toolIds: string[];
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
  sourceArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const resolved = options.toolIds
    .map((toolId) => resolveAnalysisStep({ ...options, binding: "facet", toolId }))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const missingInputs = resolved
    .flatMap((step) => describeMissingInputs(step, options.sourceArtifactTypes, new Set()))
    .filter((message, index, all) => all.indexOf(message) === index);

  if (missingInputs.length > 0) {
    throw new Error(`Facet analysis has unsatisfied inputs: ${missingInputs.join("; ")}`);
  }

  return resolved;
}

function resolveAgnosticTools(options: {
  toolIds: string[];
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
  availableArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const resolved = options.toolIds
    .map((toolId) => resolveAnalysisStep({ ...options, binding: "agnostic", toolId }))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return orderAgnosticTools({
    steps: resolved,
    availableArtifactTypes: options.availableArtifactTypes,
  });
}

function resolveAnalysisStep(options: {
  binding: AnalysisBinding;
  toolId: string;
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
}): ResolvedAnalysisStep | null {
  const config = options.config.tools[options.toolId];
  if (!config) {
    throw new Error(`Pipeline references missing tool ${options.toolId}.`);
  }
  if (!config.enabled) {
    return null;
  }

  const node =
    config.kind === "command"
      ? createCommandAnalysisNode(config)
      : (options.nodeMap.get(config.plugin) ?? null);

  if (!node) {
    throw new Error(
      `No analysis node registered for ${config.kind === "command" ? config.id : config.plugin}.`,
    );
  }

  validateAnalysisNode(node, options.binding, options.toolId);

  if (node.binding === "facet" && !hasRequiredFacets(options.projectContext, node)) {
    return null;
  }
  if (!node.detect(options.projectContext)) {
    return null;
  }

  return {
    config,
    node,
  };
}

function validateAnalysisNode(
  node: AnalysisNode,
  expectedBinding: AnalysisBinding,
  toolId: string,
): void {
  if (node.binding !== expectedBinding) {
    throw new Error(
      `Tool ${toolId} declares binding ${node.binding}, expected ${expectedBinding}.`,
    );
  }

  const requiredTypes = collectSelectorTypes(node.requires);
  const optionalTypes = node.optionalInputs ?? [];

  if (node.binding === "facet") {
    if (!node.requiredFacets?.length) {
      throw new Error(`Facet tool ${toolId} must declare requiredFacets.`);
    }
    if (!requiredTypes.some(isSourceArtifactType)) {
      throw new Error(`Facet tool ${toolId} must require at least one source artifact.`);
    }
    if (requiredTypes.some((type) => !isSourceArtifactType(type))) {
      throw new Error(`Facet tool ${toolId} may require only source artifacts.`);
    }
    if (optionalTypes.some((type) => !isSourceArtifactType(type))) {
      throw new Error(`Facet tool ${toolId} may declare only source optional inputs.`);
    }
    return;
  }

  if ((node.requiredFacets?.length ?? 0) > 0) {
    throw new Error(`Agnostic tool ${toolId} may not declare requiredFacets.`);
  }
  if (requiredTypes.some(isSourceArtifactType)) {
    throw new Error(`Agnostic tool ${toolId} may not require source artifacts.`);
  }
  if (optionalTypes.some(isSourceArtifactType)) {
    throw new Error(`Agnostic tool ${toolId} may not declare source optional inputs.`);
  }
}

function hasRequiredFacets(context: ProjectContext, node: AnalysisNode): boolean {
  const requiredFacets = node.requiredFacets ?? [];
  const availableFacets = new Set(context.facets.map((facet) => facet.id));
  return requiredFacets.every((facet) => availableFacets.has(facet));
}

function orderAgnosticTools(options: {
  steps: ResolvedAnalysisStep[];
  availableArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const ordered: ResolvedAnalysisStep[] = [];
  const available = new Set(options.availableArtifactTypes);
  const unresolved = [...options.steps];

  while (unresolved.length > 0) {
    let progress = false;

    for (let index = 0; index < unresolved.length; ) {
      const step = unresolved[index];
      if (!step) {
        break;
      }

      if (selectorSatisfiedByTypes(step.node.requires, available)) {
        ordered.push(step);
        unresolved.splice(index, 1);
        for (const type of step.node.produces) {
          available.add(type);
        }
        progress = true;
        continue;
      }

      index += 1;
    }

    if (progress) {
      continue;
    }

    const pendingProducedTypes = new Set(unresolved.flatMap((step) => step.node.produces));
    const missingInputs = unresolved
      .flatMap((step) => describeMissingInputs(step, available, pendingProducedTypes))
      .filter((message, index, all) => all.indexOf(message) === index);

    if (missingInputs.length > 0) {
      throw new Error(`Agnostic analysis has unsatisfied inputs: ${missingInputs.join("; ")}`);
    }

    throw new Error(
      `Cycle detected between agnostic analysis nodes: ${unresolved
        .map((step) => step.config.id)
        .join(", ")}`,
    );
  }

  return ordered;
}

function describeMissingInputs(
  step: ResolvedAnalysisStep,
  availableArtifactTypes: Set<string>,
  pendingProducedTypes: Set<string>,
): string[] {
  const missing: string[] = [];

  for (const type of step.node.requires.allOf ?? []) {
    if (!availableArtifactTypes.has(type) && !pendingProducedTypes.has(type)) {
      missing.push(`${step.config.id} requires ${type}`);
    }
  }

  const anyOf = step.node.requires.anyOf ?? [];
  if (
    anyOf.length > 0 &&
    !anyOf.some((type) => availableArtifactTypes.has(type) || pendingProducedTypes.has(type))
  ) {
    missing.push(`${step.config.id} requires one of ${anyOf.join(", ")}`);
  }

  return missing;
}

function selectorSatisfiedByTypes(
  selector: ArtifactSelector,
  availableArtifactTypes: Set<string>,
): boolean {
  const allOf = selector.allOf ?? [];
  const anyOf = selector.anyOf ?? [];

  if (allOf.some((type) => !availableArtifactTypes.has(type))) {
    return false;
  }

  if (anyOf.length > 0 && !anyOf.some((type) => availableArtifactTypes.has(type))) {
    return false;
  }

  return true;
}

function collectSelectorTypes(selector: ArtifactSelector): string[] {
  return [...new Set([...(selector.allOf ?? []), ...(selector.anyOf ?? [])])];
}

function isSourceArtifactType(type: string): boolean {
  return type.startsWith("source.");
}

function filterArtifactsForAnalysisStep(
  artifacts: ArtifactEnvelope[],
  node: AnalysisNode,
): ArtifactEnvelope[] {
  const selectedTypes = new Set([
    ...collectSelectorTypes(node.requires),
    ...(node.optionalInputs ?? []),
  ]);
  return artifacts.filter((artifact) => selectedTypes.has(artifact.type));
}

function filterArtifactsForSelector(
  artifacts: ArtifactEnvelope[],
  selector: ArtifactSelector,
): ArtifactEnvelope[] {
  const wanted = new Set(collectSelectorTypes(selector));
  return artifacts.filter((artifact) => wanted.has(artifact.type));
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
  const persisted: ArtifactEnvelope[] = [];

  for (const seed of options.seeds) {
    const id = `${sanitiseSegment(seed.type)}-${randomUUID()}`;
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
      payload: seed.payload,
      metadata: seed.metadata,
    };
    persisted.push(envelope);
  }

  return persisted;
}

async function writeLatestRunSnapshot(options: {
  repositoryRoot: string;
  pipelineId: string;
  manifest: RunManifest;
}): Promise<void> {
  const latestDirectory = join(
    options.repositoryRoot,
    DIREC_DIR,
    "latest",
    sanitiseSegment(options.pipelineId),
  );
  await rm(latestDirectory, { recursive: true, force: true });
  await writeJsonFile(join(latestDirectory, "manifest.json"), options.manifest);
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

function createRunId(now: () => Date): string {
  return `${now().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID()}`;
}

function sanitiseSegment(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "_");
}
