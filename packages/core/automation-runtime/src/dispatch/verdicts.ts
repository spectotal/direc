import type { SubagentRequest, SubagentResult, SubagentVerdict } from "../types.js";

export function createHandoffResult(request: SubagentRequest): SubagentResult {
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

export function determineFailureVerdict(request: SubagentRequest): SubagentVerdict {
  if (request.execution.failurePolicy === "block") {
    return "block";
  }

  if (request.execution.failurePolicy === "block_if_gatekeeper" && request.role === "gatekeeper") {
    return "block";
  }

  return "inform";
}

export function defaultVerdictForRequest(request: SubagentRequest): SubagentVerdict {
  if (request.role === "worker") {
    return "proceed";
  }

  return "inform";
}
