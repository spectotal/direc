import { buildAnalyzerSummary } from "../summary.js";
import type { BuildSubagentRequestOptions, SubagentRequest } from "../types.js";

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
