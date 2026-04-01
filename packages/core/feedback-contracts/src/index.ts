import type { ArtifactEnvelope, ProjectContext } from "@spectotal/direc-artifact-contracts";

export interface SinkConfig<TOptions = Record<string, unknown>> {
  id: string;
  plugin: string;
  enabled: boolean;
  options?: TOptions;
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

export interface FeedbackSink<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  subscribedArtifactTypes: string[];
  detect(context: ProjectContext): boolean;
  deliver(context: FeedbackSinkContext<TOptions>): Promise<void>;
}
