import type {
  AnalysisBinding,
  AnalysisNode,
  ToolConfig,
} from "@spectotal/direc-analysis-contracts";
import type { ArtifactEnvelope, ProjectContext } from "@spectotal/direc-artifact-contracts";
import type { FeedbackSink, SinkConfig } from "@spectotal/direc-feedback-contracts";
import type { SourceConfig, SourcePlugin } from "@spectotal/direc-source-contracts";

export interface PipelineAnalysisDefinition {
  facet: string[];
  agnostic: string[];
}

export interface PipelineFeedbackDefinition {
  sinks: string[];
}

export interface PipelineDefinition {
  id: string;
  description?: string;
  source: string;
  analysis: PipelineAnalysisDefinition;
  feedback: PipelineFeedbackDefinition;
}

export type SkillAgentId = "codex" | "claude" | "antigravity";

export interface SkillsWorkspaceConfig {
  agents: SkillAgentId[];
}

export interface WorkspaceConfig {
  version: 1;
  generatedAt: string;
  facets: string[];
  skills?: SkillsWorkspaceConfig;
  sources: Record<string, SourceConfig>;
  tools: Record<string, ToolConfig>;
  sinks: Record<string, SinkConfig>;
  pipelines: PipelineDefinition[];
}

export interface PipelineRegistry {
  sources: SourcePlugin[];
  analysisNodes: AnalysisNode[];
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
  sinks: Array<{
    config: SinkConfig;
    sink: FeedbackSink;
  }>;
}

export interface SinkDeliveryRecord {
  sinkId: string;
  artifactIds: string[];
  deliveredAt: string;
  outputPath?: string;
}

export interface SinkDeliveryBundle {
  runId: string;
  pipelineId: string;
  sinkId: string;
  artifacts: ArtifactEnvelope[];
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

export { createCommandAnalysisNode } from "./internal/command-node.js";
export { planPipelineExecution } from "./internal/planning.js";
export {
  ensureDirecLayout,
  readLatestRunRecord,
  readLatestSinkDelivery,
  readWorkspaceConfig,
  writeWorkspaceConfig,
} from "./internal/workspace-io.js";
export { runPipeline, watchPipeline } from "./internal/runtime.js";
