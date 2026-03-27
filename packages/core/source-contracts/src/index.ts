import type { ArtifactSeed, ProjectContext } from "@spectotal/direc-artifact-contracts";

export interface SourceConfig<TOptions = Record<string, unknown>> {
  id: string;
  plugin: string;
  enabled: boolean;
  options?: TOptions;
}

export interface SourceRunRequest<TOptions = Record<string, unknown>> {
  repositoryRoot: string;
  pipelineId: string;
  sourceConfig: SourceConfig<TOptions>;
  projectContext: ProjectContext;
  now: () => Date;
}

export interface SourceWatchRequest<
  TOptions = Record<string, unknown>,
> extends SourceRunRequest<TOptions> {
  onChange: () => void;
}

export interface SourcePlugin<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  seedArtifactTypes: string[];
  detect(context: ProjectContext): boolean;
  run(request: SourceRunRequest<TOptions>): Promise<ArtifactSeed[]>;
  watch?(request: SourceWatchRequest<TOptions>): Promise<{ close: () => void }>;
}
