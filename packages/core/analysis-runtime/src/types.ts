export type WorkflowEventType =
  | "snapshot"
  | "transition"
  | "change_completed"
  | "change_created"
  | "change_removed";

export type DetectedFacetConfidence = "low" | "medium" | "high";

export interface WorkflowChangeRef {
  id: string;
  schema?: string;
  revision?: string | null;
}

export interface WorkflowArtifactRef {
  id: string;
  outputPath?: string;
  fromStatus?: string;
  toStatus?: string;
}

export interface NormalizedWorkflowEvent {
  type: WorkflowEventType;
  source: string;
  timestamp: string;
  repositoryRoot: string;
  change?: WorkflowChangeRef;
  artifact?: WorkflowArtifactRef;
  pathScopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface DetectedFacet {
  id: string;
  confidence: DetectedFacetConfidence;
  evidence: string[];
  metadata: Record<string, unknown>;
}

export interface AnalyzerScope {
  kind: "repository" | "package" | "file" | "dependency-edge";
  path?: string;
  packageName?: string;
  dependency?: {
    from: string;
    to: string;
  };
}

export interface AnalyzerFinding {
  fingerprint: string;
  analyzerId: string;
  facetId?: string;
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  scope: AnalyzerScope;
  metrics?: Record<string, number>;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export interface AnalyzerSnapshot {
  analyzerId: string;
  timestamp: string;
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  findings: AnalyzerFinding[];
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
  rawOutput?: unknown;
}

export interface AnalyzerPrerequisiteContext {
  repositoryRoot: string;
  detectedFacets: DetectedFacet[];
  event?: NormalizedWorkflowEvent;
}

export interface AnalyzerPrerequisiteResult {
  ok: boolean;
  summary: string;
  details?: string;
}

export interface AnalyzerPrerequisite {
  id: string;
  description: string;
  check(
    context: AnalyzerPrerequisiteContext,
  ): Promise<AnalyzerPrerequisiteResult> | AnalyzerPrerequisiteResult;
}

export interface AnalyzerConfigContext {
  repositoryRoot: string;
  detectedFacets: DetectedFacet[];
}

export interface AnalyzerConfigEntry {
  enabled?: boolean;
  options?: Record<string, unknown>;
}

export interface AnalyzerRunContext<TOptions = Record<string, unknown>> {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  detectedFacets: DetectedFacet[];
  options: TOptions;
  previousSnapshot: AnalyzerSnapshot | null;
}

export interface AnalyzerPlugin<TOptions = Record<string, unknown>> {
  id: string;
  displayName: string;
  supportedFacets: string[];
  defaultEnabled?: boolean;
  prerequisites?: AnalyzerPrerequisite[];
  createDefaultOptions?(context: AnalyzerConfigContext): TOptions;
  run(context: AnalyzerRunContext<TOptions>): Promise<AnalyzerSnapshot>;
}

export type AnalyzerDisableReasonCode =
  | "disabled_in_config"
  | "facet_mismatch"
  | "missing_prerequisite";

export interface AnalyzerDisableReason {
  code: AnalyzerDisableReasonCode;
  message: string;
  prerequisiteId?: string;
}

export interface ResolvedAnalyzer<TOptions = Record<string, unknown>> {
  plugin: AnalyzerPlugin<TOptions>;
  options: TOptions;
  prerequisiteResults: Array<{
    id: string;
    result: AnalyzerPrerequisiteResult;
  }>;
}

export interface AnalyzerResolution {
  enabled: ResolvedAnalyzer[];
  disabled: Array<{
    pluginId: string;
    displayName: string;
    supportedFacets: string[];
    reasons: AnalyzerDisableReason[];
  }>;
}

export interface DirecConfig {
  version: 1;
  generatedAt: string;
  facets: string[];
  analyzers: Record<string, AnalyzerConfigEntry>;
}

export interface AnalyzerRunResult {
  analyzerId: string;
  status: "success" | "failed";
  snapshot?: AnalyzerSnapshot;
  latestPath?: string;
  historyPath?: string;
  errorMessage?: string;
}

export interface RuntimeExecutionResult {
  event: NormalizedWorkflowEvent;
  resolution: AnalyzerResolution;
  runs: AnalyzerRunResult[];
}
