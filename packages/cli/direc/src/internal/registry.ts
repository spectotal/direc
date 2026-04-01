import type {
  FeedbackNoticePayload,
  FeedbackVerdictPayload,
} from "@spectotal/direc-artifact-contracts";
import type { FeedbackRule } from "@spectotal/direc-feedback-contracts";
import type { PipelineRegistry } from "@spectotal/direc-pipeline-manager";
import { consoleSink } from "@spectotal/direc-sink-console";
import { gitDiffSource } from "@spectotal/direc-source-git-diff";
import { openSpecSource } from "@spectotal/direc-source-openspec";
import { repositorySource } from "@spectotal/direc-source-repository";
import { boundsEvaluatorNode } from "@spectotal/direc-tool-bounds-evaluator";
import { clusterBuilderNode } from "@spectotal/direc-tool-cluster-builder";
import { jsComplexityNode } from "@spectotal/direc-tool-js-complexity";
import { graphMakerNode } from "@spectotal/direc-tool-graph-maker";
import { specDocumentsNode } from "@spectotal/direc-tool-spec-documents";
import { specConflictNode } from "@spectotal/direc-tool-spec-conflict";

export const analysisThresholdRule: FeedbackRule<{ blockOnError?: boolean }> = {
  id: "analysis-thresholds",
  displayName: "Analysis Thresholds",
  defaultSelector: {
    anyOf: ["metric.complexity", "evaluation.bounds-distance", "evaluation.spec-conflict"],
  },
  async run(context) {
    let errorCount = 0;
    let warningCount = 0;

    for (const artifact of context.inputArtifacts) {
      const payload = artifact.payload as {
        errorCount?: number;
        warningCount?: number;
        conflictCount?: number;
      };
      errorCount += payload.errorCount ?? 0;
      warningCount += payload.warningCount ?? payload.conflictCount ?? 0;
    }

    return [
      {
        type: "feedback.notice",
        scope: {
          kind: "feedback",
        },
        payload: {
          severity: errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "info",
          summary: `Analysis summary: ${errorCount} error(s), ${warningCount} warning(s).`,
          counts: {
            errorCount,
            warningCount,
          },
        } satisfies FeedbackNoticePayload,
      },
      {
        type: "feedback.verdict",
        scope: {
          kind: "feedback",
        },
        payload: {
          verdict: errorCount > 0 && (context.options.blockOnError ?? true) ? "block" : "proceed",
          summary:
            errorCount > 0 ? "Blocking due to analysis errors." : "No blocking findings detected.",
          counts: {
            errorCount,
            warningCount,
          },
        } satisfies FeedbackVerdictPayload,
      },
    ];
  },
};

export function createBuiltinRegistry(): PipelineRegistry {
  return {
    sources: [repositorySource, gitDiffSource, openSpecSource],
    analysisNodes: [
      jsComplexityNode,
      graphMakerNode,
      clusterBuilderNode,
      boundsEvaluatorNode,
      specDocumentsNode,
      specConflictNode,
    ],
    feedbackRules: [analysisThresholdRule],
    sinks: [consoleSink],
  };
}
