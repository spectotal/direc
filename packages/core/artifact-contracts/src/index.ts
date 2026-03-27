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
  payloadPath: string;
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

export function normalisePaths(paths: string[]): string[] {
  return [...new Set(paths.filter((path) => path.length > 0))].sort();
}

export function selectArtifactsByType<TPayload = unknown>(
  artifacts: ArtifactEnvelope[],
  types: string[],
): ArtifactEnvelope<TPayload>[] {
  const wanted = new Set(types);
  return artifacts.filter((artifact) => wanted.has(artifact.type)) as ArtifactEnvelope<TPayload>[];
}

export function satisfiesSelector(
  artifacts: ArtifactEnvelope[],
  selector: ArtifactSelector,
): boolean {
  const artifactTypes = new Set(artifacts.map((artifact) => artifact.type));
  const allOf = selector.allOf ?? [];
  const anyOf = selector.anyOf ?? [];

  if (allOf.some((type) => !artifactTypes.has(type))) {
    return false;
  }

  if (anyOf.length > 0 && !anyOf.some((type) => artifactTypes.has(type))) {
    return false;
  }

  return true;
}

export function collectScopedPaths(artifacts: ArtifactEnvelope[]): string[] {
  const paths = new Set<string>();

  for (const artifact of artifacts) {
    for (const path of artifact.scope.paths ?? []) {
      paths.add(path);
    }

    if (
      artifact.payload &&
      typeof artifact.payload === "object" &&
      artifact.payload !== null &&
      "paths" in artifact.payload &&
      Array.isArray((artifact.payload as { paths?: unknown }).paths)
    ) {
      for (const path of (artifact.payload as { paths: unknown[] }).paths) {
        if (typeof path === "string") {
          paths.add(path);
        }
      }
    }
  }

  return normalisePaths([...paths]);
}
