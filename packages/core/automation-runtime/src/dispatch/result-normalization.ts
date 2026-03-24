import type { SubagentRequest, SubagentResult } from "../types.js";
import { isVerdict, asString, isRecord } from "./payload.js";
import { mergeDiagnostics } from "./result-diagnostics.js";
import { normalizeResultFindings } from "./result-findings.js";
import { normalizeExecutionOutcome, normalizeWorkOrder } from "./result-shapes.js";
import { defaultVerdictForRequest } from "./verdicts.js";

export function normalizeSubagentResult(
  request: SubagentRequest,
  payload: unknown,
  diagnostics: NonNullable<SubagentResult["diagnostics"]>,
): SubagentResult {
  const candidate = isRecord(payload) ? payload : {};

  return {
    requestId: request.id,
    timestamp: asString(candidate.timestamp) ?? new Date().toISOString(),
    status: candidate.status === "failed" ? "failed" : "success",
    verdict: isVerdict(candidate.verdict) ? candidate.verdict : defaultVerdictForRequest(request),
    summary: asString(candidate.summary) ?? defaultSummary(request),
    findings: normalizeResultFindings(candidate.findings),
    workOrder: normalizeWorkOrder(candidate.workOrder),
    executionOutcome: normalizeExecutionOutcome(candidate.executionOutcome),
    diagnostics: mergeDiagnostics(candidate.diagnostics, diagnostics),
  };
}

function defaultSummary(request: SubagentRequest): string {
  return `Processed ${request.trigger.eventType} in ${request.trigger.workflowSource}.`;
}
