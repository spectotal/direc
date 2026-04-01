import type { PipelineRegistry } from "@spectotal/direc-pipeline-manager";
import { agentFeedbackSink } from "@spectotal/direc-sink-agent-feedback";
import { consoleSink } from "@spectotal/direc-sink-console";
import { gitDiffSource } from "@spectotal/direc-source-git-diff";
import { openSpecSource } from "@spectotal/direc-source-openspec";
import { repositorySource } from "@spectotal/direc-source-repository";
import { boundsEvaluatorNode } from "@spectotal/direc-tool-bounds-evaluator";
import { clusterBuilderNode } from "@spectotal/direc-tool-cluster-builder";
import { complexityFindingsNode } from "@spectotal/direc-tool-complexity-findings";
import { jsComplexityNode } from "@spectotal/direc-tool-js-complexity";
import { graphMakerNode } from "@spectotal/direc-tool-graph-maker";
import { specDocumentsNode } from "@spectotal/direc-tool-spec-documents";
import { specConflictNode } from "@spectotal/direc-tool-spec-conflict";

export function createBuiltinRegistry(): PipelineRegistry {
  return {
    sources: [repositorySource, gitDiffSource, openSpecSource],
    analysisNodes: [
      jsComplexityNode,
      graphMakerNode,
      clusterBuilderNode,
      boundsEvaluatorNode,
      complexityFindingsNode,
      specDocumentsNode,
      specConflictNode,
    ],
    sinks: [consoleSink, agentFeedbackSink],
  };
}
