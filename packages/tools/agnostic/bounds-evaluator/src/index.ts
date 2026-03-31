import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { BoundariesArtifactPayload } from "@spectotal/direc-tool-cluster-builder";
import type { ComplexityArtifactPayload } from "@spectotal/direc-tool-js-complexity";
import type { GraphArtifactPayload } from "@spectotal/direc-tool-graph-maker";
import type { BoundsDistanceArtifactPayload } from "./contracts.js";

export type { BoundsDistanceArtifactPayload } from "./contracts.js";

export const boundsEvaluatorNode: AnalysisNode = {
  id: "bounds-evaluator",
  displayName: "Bounds Evaluator",
  binding: "agnostic",
  requires: {
    allOf: ["structural.graph", "structural.boundaries"],
  },
  optionalInputs: ["metric.complexity"],
  produces: ["evaluation.bounds-distance"],
  detect: () => true,
  async run(context) {
    const complexity = context.inputArtifacts.find(
      (artifact) => artifact.type === "metric.complexity",
    )?.payload as ComplexityArtifactPayload | undefined;
    const graph = context.inputArtifacts.find((artifact) => artifact.type === "structural.graph")
      ?.payload as GraphArtifactPayload | undefined;
    const boundaries = context.inputArtifacts.find(
      (artifact) => artifact.type === "structural.boundaries",
    )?.payload as BoundariesArtifactPayload | undefined;

    const clusterByPath = boundaries?.clusterByPath ?? {};
    let crossBoundaryCount = 0;

    for (const edge of graph?.edges ?? []) {
      const fromCluster = clusterByPath[edge.from];
      const toCluster = clusterByPath[edge.to];
      if (fromCluster && toCluster && fromCluster !== toCluster) {
        crossBoundaryCount += 1;
      }
    }

    const errorCount = complexity?.errorCount ?? 0;
    const warningCount = (complexity?.warningCount ?? 0) + crossBoundaryCount;

    return [
      {
        type: "evaluation.bounds-distance",
        scope: {
          kind: "feedback",
        },
        payload: {
          errorCount,
          warningCount,
          complexityErrorCount: complexity?.errorCount ?? 0,
          complexityWarningCount: complexity?.warningCount ?? 0,
          crossBoundaryCount,
          summary:
            crossBoundaryCount > 0
              ? `Detected ${crossBoundaryCount} cross-cluster dependency edge(s).`
              : "All dependencies stay within inferred cluster bounds.",
        } satisfies BoundsDistanceArtifactPayload,
      },
    ];
  },
};
