import { randomUUID } from "node:crypto";
import { createSubagentBackend } from "./backends.js";
import {
  writeLatestSubagentResult,
  writeSubagentRequest,
  writeSubagentResult,
} from "./persistence.js";
import { buildSubagentRequest } from "./dispatch/request.js";
import { normalizeSubagentResult } from "./dispatch/result-normalization.js";
import { shouldDispatchAutomationEvent } from "./dispatch/selection.js";
import { createHandoffResult, determineFailureVerdict } from "./dispatch/verdicts.js";
import type {
  AutomationDispatchResult,
  DispatchAutomationEventOptions,
  SubagentRequest,
  SubagentResult,
} from "./types.js";

export { buildSubagentRequest } from "./dispatch/request.js";

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
