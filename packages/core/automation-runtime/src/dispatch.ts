import { randomUUID } from "node:crypto";
import { WORKFLOW_EVENT_TYPES } from "direc-workflow-runtime";
import { createSubagentBackend } from "./backends.js";
import {
  writeLatestSubagentResult,
  writeSubagentRequest,
  writeSubagentResult,
} from "./persistence.js";
import { buildAnalyzerSummary } from "./summary.js";
import type {
  AutomationDispatchResult,
  BuildSubagentRequestOptions,
  DispatchAutomationEventOptions,
  SubagentRequest,
  SubagentResult,
  SubagentVerdict,
} from "./types.js";

export async function dispatchAutomationEvent(
  options: DispatchAutomationEventOptions,
): Promise<AutomationDispatchResult> {
  if (!options.profile.enabled) {
    return {
      triggered: false,
      skippedReason: "automation is disabled in .direc/config.json",
    };
  }

  if (!shouldDispatchAutomationEvent(options.profile, options.event)) {
    return {
      triggered: false,
      skippedReason: `event ${options.event.type} is not enabled for automation`,
    };
  }

  const now = options.now?.() ?? new Date();
  const request = buildSubagentRequest({
    repositoryRoot: options.repositoryRoot,
    event: options.event,
    detectedFacets: options.detectedFacets,
    analysisResult: options.analysisResult,
    profile: options.profile,
    requestId: options.requestIdFactory?.() ?? randomUUID(),
    now,
  });
  const requestPath = await writeSubagentRequest(options.repositoryRoot, request);

  const result =
    options.profile.invocation === "handoff"
      ? createHandoffResult(request)
      : await executeSubagentRequest(options, request);
  const resultPath = await writeSubagentResult(options.repositoryRoot, result);
  const latestPath = await writeLatestSubagentResult(
    options.repositoryRoot,
    options.event.change?.id ?? "repository",
    {
      requestId: request.id,
      updatedAt: result.timestamp,
      changeId: options.event.change?.id ?? "repository",
      requestPath,
      resultPath,
      result,
    },
  );

  return {
    triggered: true,
    request,
    result,
    requestPath,
    resultPath,
    latestPath,
  };
}

export function buildSubagentRequest(options: BuildSubagentRequestOptions): SubagentRequest {
  const analyzerSummary = buildAnalyzerSummary(options.analysisResult);
  const allowedPaths = options.profile.mode === "worker" ? analyzerSummary.matchedPaths : [];

  return {
    id: options.requestId,
    timestamp: (options.now ?? new Date()).toISOString(),
    role: options.profile.mode,
    repositoryRoot: options.repositoryRoot,
    trigger: {
      workflowSource: options.event.source,
      eventType: options.event.type,
      changeId: options.event.change?.id,
      artifactId: options.event.artifact?.id,
      workItemId: options.event.workItem?.id,
    },
    change: options.event.change,
    artifact: options.event.artifact,
    workItem: options.event.workItem,
    pathScopes: options.event.pathScopes ?? [],
    detectedFacets: options.detectedFacets.map((facet) => facet.id),
    analyzerSummary,
    execution: {
      invocation: options.profile.invocation,
      failurePolicy: options.profile.failurePolicy,
      transportKind: options.profile.transport.kind,
      constraints: {
        writeAccess: options.profile.mode === "worker" ? "bounded" : "none",
        allowedPaths,
      },
    },
    metadata: {
      event: options.event,
      changeSchema: options.event.change?.schema,
    },
  };
}

function shouldDispatchAutomationEvent(
  profile: DispatchAutomationEventOptions["profile"],
  event: DispatchAutomationEventOptions["event"],
): boolean {
  switch (event.type) {
    case WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION:
      return profile.triggers.workItemTransitions;
    case WORKFLOW_EVENT_TYPES.TRANSITION:
      return profile.triggers.artifactTransitions;
    case WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED:
      return profile.triggers.changeCompleted;
    default:
      return false;
  }
}

async function executeSubagentRequest(
  options: DispatchAutomationEventOptions,
  request: SubagentRequest,
): Promise<SubagentResult> {
  const backend =
    options.backend ?? createSubagentBackend(options.repositoryRoot, options.profile.transport);

  try {
    const response = await backend.run(request);
    return normalizeSubagentResult(request, response.payload, response.diagnostics);
  } catch (error) {
    return {
      requestId: request.id,
      timestamp: new Date().toISOString(),
      status: "failed",
      verdict: determineFailureVerdict(request),
      summary:
        error instanceof Error ? error.message : "Subagent execution failed with an unknown error.",
      findings: [],
      diagnostics: {
        transportKind: options.profile.transport.kind,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function normalizeSubagentResult(
  request: SubagentRequest,
  payload: unknown,
  diagnostics: NonNullable<SubagentResult["diagnostics"]>,
): SubagentResult {
  const candidate = isRecord(payload) ? payload : {};

  return {
    requestId: request.id,
    timestamp:
      typeof candidate.timestamp === "string" ? candidate.timestamp : new Date().toISOString(),
    status: candidate.status === "failed" ? "failed" : "success",
    verdict: isVerdict(candidate.verdict) ? candidate.verdict : defaultVerdictForRequest(request),
    summary:
      typeof candidate.summary === "string"
        ? candidate.summary
        : `Processed ${request.trigger.eventType} in ${request.trigger.workflowSource}.`,
    findings: Array.isArray(candidate.findings)
      ? candidate.findings.flatMap(normalizeResultFinding)
      : [],
    workOrder: normalizeWorkOrder(candidate.workOrder),
    executionOutcome: normalizeExecutionOutcome(candidate.executionOutcome),
    diagnostics: mergeDiagnostics(candidate.diagnostics, diagnostics),
  };
}

function createHandoffResult(request: SubagentRequest): SubagentResult {
  return {
    requestId: request.id,
    timestamp: new Date().toISOString(),
    status: "success",
    verdict: "handoff",
    summary: `Persisted automation request for ${request.trigger.eventType}; awaiting external subagent handling.`,
    findings: [],
    diagnostics: {
      transportKind: request.execution.transportKind,
    },
  };
}

function determineFailureVerdict(request: SubagentRequest): SubagentVerdict {
  if (request.execution.failurePolicy === "block") {
    return "block";
  }

  if (request.execution.failurePolicy === "block_if_gatekeeper" && request.role === "gatekeeper") {
    return "block";
  }

  return "inform";
}

function defaultVerdictForRequest(request: SubagentRequest): SubagentVerdict {
  if (request.role === "worker") {
    return "proceed";
  }

  return "inform";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVerdict(value: unknown): value is SubagentVerdict {
  return value === "inform" || value === "proceed" || value === "block" || value === "handoff";
}

function normalizeResultFinding(value: unknown): SubagentResult["findings"] {
  if (!isRecord(value)) {
    return [];
  }

  if (value.severity !== "info" && value.severity !== "warning" && value.severity !== "error") {
    return [];
  }

  if (typeof value.category !== "string" || typeof value.message !== "string") {
    return [];
  }

  return [
    {
      severity: value.severity,
      category: value.category,
      message: value.message,
      path: typeof value.path === "string" ? value.path : undefined,
    },
  ];
}

function normalizeWorkOrder(value: unknown): SubagentResult["workOrder"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.title !== "string" || typeof value.summary !== "string") {
    return undefined;
  }

  return {
    title: value.title,
    summary: value.summary,
    allowedPaths: Array.isArray(value.allowedPaths)
      ? value.allowedPaths.filter((path): path is string => typeof path === "string")
      : [],
    suggestedCommands: Array.isArray(value.suggestedCommands)
      ? value.suggestedCommands.filter((command): command is string => typeof command === "string")
      : undefined,
  };
}

function normalizeExecutionOutcome(value: unknown): SubagentResult["executionOutcome"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    started: typeof value.started === "boolean" ? value.started : undefined,
    completed: typeof value.completed === "boolean" ? value.completed : undefined,
    summary: typeof value.summary === "string" ? value.summary : undefined,
    changedPaths: Array.isArray(value.changedPaths)
      ? value.changedPaths.filter((path): path is string => typeof path === "string")
      : undefined,
  };
}

function mergeDiagnostics(
  value: unknown,
  diagnostics: NonNullable<SubagentResult["diagnostics"]>,
): NonNullable<SubagentResult["diagnostics"]> {
  if (!isRecord(value)) {
    return diagnostics;
  }

  return {
    ...diagnostics,
    durationMs: typeof value.durationMs === "number" ? value.durationMs : diagnostics.durationMs,
    exitCode: typeof value.exitCode === "number" ? value.exitCode : diagnostics.exitCode,
    statusCode: typeof value.statusCode === "number" ? value.statusCode : diagnostics.statusCode,
    stderr: typeof value.stderr === "string" ? value.stderr : diagnostics.stderr,
    error: typeof value.error === "string" ? value.error : diagnostics.error,
  };
}
