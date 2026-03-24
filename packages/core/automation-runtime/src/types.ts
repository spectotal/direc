import type {
  AutomationConfig,
  DetectedFacet,
  RuntimeExecutionResult,
} from "direc-analysis-runtime";
import type {
  NormalizedWorkflowEvent,
  WorkflowArtifactRef,
  WorkflowChangeRef,
  WorkflowId,
  WorkflowWorkItemRef,
} from "direc-workflow-runtime";

export type SubagentVerdict = "inform" | "proceed" | "block" | "handoff";

export interface SubagentSummaryFinding {
  analyzerId: string;
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  path?: string;
}

export interface SubagentAnalyzerReport {
  analyzerId: string;
  findingCount: number;
  latestPath?: string;
  status: "success" | "failed";
}

export interface SubagentAnalyzerSummary {
  enabledAnalyzers: string[];
  successfulRuns: number;
  failedRuns: number;
  findingCount: number;
  severityCounts: {
    info: number;
    warning: number;
    error: number;
  };
  topFindings: SubagentSummaryFinding[];
  reports: SubagentAnalyzerReport[];
  matchedPaths: string[];
}

export interface SubagentExecutionConstraints {
  writeAccess: "none" | "bounded";
  allowedPaths: string[];
}

export interface SubagentExecutionConfig {
  invocation: AutomationConfig["invocation"];
  failurePolicy: AutomationConfig["failurePolicy"];
  transportKind: AutomationConfig["transport"]["kind"];
  constraints: SubagentExecutionConstraints;
}

export interface SubagentTrigger {
  workflowSource: WorkflowId;
  eventType: NormalizedWorkflowEvent["type"];
  changeId?: string;
  artifactId?: string;
  workItemId?: string;
}

export interface SubagentRequest {
  id: string;
  timestamp: string;
  role: AutomationConfig["mode"];
  repositoryRoot: string;
  trigger: SubagentTrigger;
  change?: WorkflowChangeRef;
  artifact?: WorkflowArtifactRef;
  workItem?: WorkflowWorkItemRef;
  pathScopes: string[];
  detectedFacets: string[];
  analyzerSummary: SubagentAnalyzerSummary;
  execution: SubagentExecutionConfig;
  metadata: {
    event: NormalizedWorkflowEvent;
    changeSchema?: string;
  };
}

export interface SubagentResultFinding {
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  path?: string;
}

export interface SubagentWorkOrder {
  title: string;
  summary: string;
  allowedPaths: string[];
  suggestedCommands?: string[];
}

export interface SubagentExecutionOutcome {
  started?: boolean;
  completed?: boolean;
  summary?: string;
  changedPaths?: string[];
}

export interface SubagentBackendDiagnostics {
  transportKind: AutomationConfig["transport"]["kind"];
  durationMs?: number;
  exitCode?: number;
  statusCode?: number;
  stderr?: string;
  error?: string;
}

export interface SubagentResult {
  requestId: string;
  timestamp: string;
  status: "success" | "failed";
  verdict: SubagentVerdict;
  summary: string;
  findings: SubagentResultFinding[];
  workOrder?: SubagentWorkOrder;
  executionOutcome?: SubagentExecutionOutcome;
  diagnostics?: SubagentBackendDiagnostics;
}

export interface SubagentBackendResponse {
  payload: unknown;
  diagnostics: SubagentBackendDiagnostics;
}

export interface SubagentBackend {
  run(request: SubagentRequest): Promise<SubagentBackendResponse>;
}

export interface DispatchAutomationEventOptions {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  detectedFacets: DetectedFacet[];
  analysisResult: RuntimeExecutionResult;
  profile: AutomationConfig;
  backend?: SubagentBackend;
  requestIdFactory?: () => string;
  now?: () => Date;
}

export interface AutomationDispatchResult {
  triggered: boolean;
  request?: SubagentRequest;
  result?: SubagentResult;
  requestPath?: string;
  resultPath?: string;
  latestPath?: string;
  skippedReason?: string;
}

export interface SubagentLatestRecord {
  requestId: string;
  updatedAt: string;
  changeId: string;
  requestPath: string;
  resultPath: string;
  result: SubagentResult;
}

export interface BuildSubagentRequestOptions {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  detectedFacets: DetectedFacet[];
  analysisResult: RuntimeExecutionResult;
  profile: AutomationConfig;
  requestId: string;
  now?: Date;
}
