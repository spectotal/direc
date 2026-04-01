import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import { normalisePaths } from "@spectotal/direc-artifact-contracts";
import type { GraphArtifactPayload } from "./contracts.js";
import { collectGraphEdges } from "./import-resolution.js";
import { isJsPath, resolveJsSourcePaths } from "./source-paths.js";

export type { GraphArtifactPayload, GraphEdge } from "./contracts.js";

export const graphMakerNode: AnalysisNode = {
  id: "graph-maker",
  displayName: "Graph Maker",
  binding: "facet",
  requires: {
    anyOf: ["source.diff.scope", "source.openspec.task", "source.repository.scope"],
  },
  requiredFacets: ["js"],
  produces: ["structural.graph"],
  detect(context) {
    return context.facets.some((facet) => facet.id === "js");
  },
  async run(context) {
    const sourcePaths = resolveJsSourcePaths(
      context.inputArtifacts,
      context.projectContext.sourceFiles.filter(isJsPath),
    );
    const nodes = normalisePaths(sourcePaths);
    const edges = await collectGraphEdges(nodes);

    return [
      {
        type: "structural.graph",
        scope: {
          kind: "paths",
          paths: nodes,
        },
        payload: {
          nodes,
          edges,
        } satisfies GraphArtifactPayload,
      },
    ];
  },
};
