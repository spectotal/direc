import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";

export const boundsEvaluatorNode: AnalysisNode = {
  id: "bounds-evaluator",
  displayName: "Bounds Evaluator",
  selector: {
    allOf: ["metric.complexity", "structural.graph", "structural.boundaries"],
  },
  produces: ["evaluation.bounds-distance"],
  detect: () => true,
  async run(context) {
    const complexity = context.inputArtifacts.find(
      (artifact) => artifact.type === "metric.complexity",
    )?.payload as
      | {
          errorCount?: number;
          warningCount?: number;
        }
      | undefined;
    const graph = context.inputArtifacts.find((artifact) => artifact.type === "structural.graph")
      ?.payload as
      | {
          edges?: Array<{ from: string; to: string }>;
        }
      | undefined;
    const boundaries = context.inputArtifacts.find(
      (artifact) => artifact.type === "structural.boundaries",
    )?.payload as
      | {
          clusterByPath?: Record<string, string>;
        }
      | undefined;

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
        },
      },
    ];
  },
};
