import type { NormalizedWorkflowEvent, WorkflowId } from "direc-workflow-runtime";
export type { NormalizedWorkflowEvent } from "direc-workflow-runtime";

export type DetectedFacetConfidence = "low" | "medium" | "high";

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

export type AutomationMode = "advisory" | "gatekeeper" | "worker";

export type AutomationInvocation = "direct" | "handoff" | "hybrid";

export type AutomationFailurePolicy = "continue" | "block_if_gatekeeper" | "block";

export interface AutomationCommandTransportConfig {
  kind: "command";
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface AutomationHttpTransportConfig {
  kind: "http";
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface AutomationSdkTransportConfig {
  kind: "sdk";
  modulePath: string;
  exportName?: string;
}

export type AutomationTransportConfig =
  | AutomationCommandTransportConfig
  | AutomationHttpTransportConfig
  | AutomationSdkTransportConfig;

export interface AutomationTriggerConfig {
  workItemTransitions: boolean;
  artifactTransitions: boolean;
  changeCompleted: boolean;
}

export interface AutomationConfig {
  enabled: boolean;
  mode: AutomationMode;
  invocation: AutomationInvocation;
  failurePolicy: AutomationFailurePolicy;
  transport: AutomationTransportConfig;
  triggers: AutomationTriggerConfig;
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
  workflow: WorkflowId;
  facets: string[];
  analyzers: Record<string, AnalyzerConfigEntry>;
  automation?: AutomationConfig;
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
