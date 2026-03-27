import type {
  ArtifactEnvelope,
  ArtifactSelector,
  ArtifactSeed,
  ProjectContext,
} from "@spectotal/direc-artifact-contracts";

export interface SinkConfig<TOptions = Record<string, unknown>> {
  id: string;
  plugin: string;
  enabled: boolean;
  options?: TOptions;
}

export interface FeedbackRuleDefinition<TOptions = Record<string, unknown>> {
  id: string;
  plugin: string;
  selector?: ArtifactSelector;
  options?: TOptions;
}

export interface FeedbackRuleContext<TOptions = Record<string, unknown>> {
  repositoryRoot: string;
  runId: string;
  pipelineId: string;
  sourceId: string;
  rule: FeedbackRuleDefinition<TOptions>;
  projectContext: ProjectContext;
  inputArtifacts: ArtifactEnvelope[];
  options: TOptions;
  now: () => Date;
}

export interface FeedbackSinkContext<TOptions = Record<string, unknown>> {
  repositoryRoot: string;
  runId: string;
  pipelineId: string;
  sourceId: string;
  sinkConfig: SinkConfig<TOptions>;
  projectContext: ProjectContext;
  artifacts: ArtifactEnvelope[];
  now: () => Date;
}

export interface FeedbackRule<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  defaultSelector: ArtifactSelector;
  run(context: FeedbackRuleContext<TOptions>): Promise<ArtifactSeed[]>;
}

export interface FeedbackSink<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  subscribedArtifactTypes: string[];
  detect(context: ProjectContext): boolean;
  deliver(context: FeedbackSinkContext<TOptions>): Promise<void>;
}
