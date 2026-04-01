export interface ProjectFacet {
  id: string;
  evidence: string[];
}

export interface ProjectContext {
  repositoryRoot: string;
  facets: ProjectFacet[];
  sourceFiles: string[];
  hasGit: boolean;
  hasOpenSpec: boolean;
}

export type ArtifactScopeKind = "repository" | "paths" | "task" | "spec" | "feedback";

export interface ArtifactScope {
  kind: ArtifactScopeKind;
  paths?: string[];
  changeId?: string;
  taskId?: string;
  specPath?: string;
}

export interface ArtifactSelector {
  allOf?: string[];
  anyOf?: string[];
}

export interface ArtifactSeed<TPayload = unknown> {
  type: string;
  scope: ArtifactScope;
  payload: TPayload;
  metadata?: Record<string, unknown>;
}

export interface ArtifactEnvelope<TPayload = unknown> extends ArtifactSeed<TPayload> {
  id: string;
  producerId: string;
  runId: string;
  pipelineId: string;
  sourceId: string;
  inputArtifactIds: string[];
  timestamp: string;
}

export type FeedbackSeverity = "info" | "warning" | "error";
export type FeedbackVerdict = "inform" | "proceed" | "block";

export interface FeedbackNoticePayload {
  severity: FeedbackSeverity;
  summary: string;
  details?: string;
  counts?: Record<string, number>;
}

export interface FeedbackVerdictPayload {
  verdict: FeedbackVerdict;
  summary: string;
  counts?: Record<string, number>;
}

export { collectScopedPaths, normalisePaths } from "./internal/path-utils.js";
export { satisfiesSelector, selectArtifactsByType } from "./internal/selectors.js";
