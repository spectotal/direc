import type {
  ArtifactEnvelope,
  ArtifactSelector,
  ArtifactSeed,
  ProjectContext,
} from "@spectotal/direc-artifact-contracts";

export interface BuiltinToolConfig<TOptions = Record<string, unknown>> {
  id: string;
  plugin: string;
  kind: "builtin";
  enabled: boolean;
  options?: TOptions;
}

export interface CommandSpec {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface CommandToolConfig<TOptions = Record<string, unknown>> {
  id: string;
  kind: "command";
  enabled: boolean;
  selector: ArtifactSelector;
  produces: string[];
  command: CommandSpec;
  options?: TOptions;
}

export type ToolConfig<TOptions = Record<string, unknown>> =
  | BuiltinToolConfig<TOptions>
  | CommandToolConfig<TOptions>;

export interface AnalysisRunContext<TOptions = Record<string, unknown>> {
  repositoryRoot: string;
  runId: string;
  pipelineId: string;
  sourceId: string;
  toolConfig: ToolConfig<TOptions>;
  projectContext: ProjectContext;
  inputArtifacts: ArtifactEnvelope[];
  options: TOptions;
  now: () => Date;
}

export interface AnalysisNode<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  selector: ArtifactSelector;
  produces: string[];
  detect(context: ProjectContext): boolean;
  isApplicable?(context: AnalysisRunContext<TOptions>): boolean;
  run(context: AnalysisRunContext<TOptions>): Promise<ArtifactSeed[]>;
}
