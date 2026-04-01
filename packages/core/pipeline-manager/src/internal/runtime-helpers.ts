import type { AnalysisBinding, ToolConfig } from "@spectotal/direc-analysis-contracts";
import type { ArtifactEnvelope } from "@spectotal/direc-artifact-contracts";
import { satisfiesSelector, selectArtifactsByType } from "@spectotal/direc-artifact-contracts";
import type {
  PipelinePlan,
  RunManifest,
  RunPipelineOptions,
  SinkDeliveryBundle,
  SinkDeliveryRecord,
} from "../index.js";
import { extractOptions, filterArtifactsForAnalysisStep } from "./analysis-context.js";
import { persistArtifactSeeds, sanitiseSegment } from "./persistence.js";

const ANALYSIS_BINDINGS: AnalysisBinding[] = ["facet", "agnostic"];

export async function collectArtifacts(
  options: RunPipelineOptions,
  plan: PipelinePlan,
  runId: string,
  now: () => Date,
): Promise<ArtifactEnvelope[]> {
  const artifacts = await persistSourceArtifacts(options, plan, runId, now);

  for (const binding of ANALYSIS_BINDINGS) {
    await runAnalysisBinding(options, plan, binding, artifacts, runId, now);
  }

  return artifacts;
}

export async function deliverArtifacts(
  options: RunPipelineOptions,
  plan: PipelinePlan,
  artifacts: ArtifactEnvelope[],
  runId: string,
  now: () => Date,
): Promise<{
  deliveries: SinkDeliveryRecord[];
  deliveryBundles: SinkDeliveryBundle[];
}> {
  const deliveries: SinkDeliveryRecord[] = [];
  const deliveryBundles: SinkDeliveryBundle[] = [];

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

    const outputPath = joinDeliveryPath(entry.config.id);
    deliveries.push({
      sinkId: entry.config.id,
      artifactIds: subscribedArtifacts.map((artifact) => artifact.id),
      deliveredAt: now().toISOString(),
      outputPath,
    });
    deliveryBundles.push({
      runId,
      pipelineId: plan.pipeline.id,
      sinkId: entry.config.id,
      artifacts: subscribedArtifacts,
    });
  }

  return {
    deliveries,
    deliveryBundles,
  };
}

export function createManifest(
  runId: string,
  pipelineId: string,
  sourceId: string,
  startedAt: string,
  artifacts: ArtifactEnvelope[],
  deliveries: SinkDeliveryRecord[],
  now: () => Date,
): RunManifest {
  return {
    runId,
    pipelineId,
    sourceId,
    startedAt,
    finishedAt: now().toISOString(),
    artifactCount: artifacts.length,
    artifacts,
    deliveries,
  };
}

async function persistSourceArtifacts(
  options: RunPipelineOptions,
  plan: PipelinePlan,
  runId: string,
  now: () => Date,
): Promise<ArtifactEnvelope[]> {
  const sourceSeeds = await plan.sourcePlugin.run({
    repositoryRoot: options.repositoryRoot,
    pipelineId: plan.pipeline.id,
    sourceConfig: plan.sourceConfig,
    projectContext: options.projectContext,
    now,
  });

  return await persistArtifactSeeds({
    runId,
    pipelineId: plan.pipeline.id,
    sourceId: plan.sourceConfig.id,
    producerId: plan.sourcePlugin.id,
    seeds: sourceSeeds,
    inputArtifactIds: [],
    now,
  });
}

async function runAnalysisBinding(
  options: RunPipelineOptions,
  plan: PipelinePlan,
  binding: AnalysisBinding,
  artifacts: ArtifactEnvelope[],
  runId: string,
  now: () => Date,
): Promise<void> {
  for (const step of plan.analysis[binding]) {
    const inputArtifacts = filterArtifactsForAnalysisStep(artifacts, step.node);
    if (!satisfiesSelector(inputArtifacts, step.node.requires)) {
      continue;
    }

    const context = createAnalysisContext(options, plan, step.config, inputArtifacts, runId, now);
    if (step.node.isApplicable && !step.node.isApplicable(context)) {
      continue;
    }

    const outputSeeds = await step.node.run(context);
    artifacts.push(
      ...(await persistArtifactSeeds({
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

function createAnalysisContext(
  options: RunPipelineOptions,
  plan: PipelinePlan,
  toolConfig: ToolConfig,
  inputArtifacts: ArtifactEnvelope[],
  runId: string,
  now: () => Date,
) {
  return {
    repositoryRoot: options.repositoryRoot,
    runId,
    pipelineId: plan.pipeline.id,
    sourceId: plan.sourceConfig.id,
    toolConfig,
    projectContext: options.projectContext,
    inputArtifacts,
    options: extractOptions(toolConfig),
    now,
  };
}

function joinDeliveryPath(sinkId: string): string {
  return `deliveries/${sanitiseSegment(sinkId)}.json`;
}
