import { relative } from "node:path";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { GraphArtifactPayload } from "@spectotal/direc-tool-graph-maker";
import type {
  BoundariesArtifactPayload,
  ClusterArtifactPayload,
  RolesArtifactPayload,
} from "./contracts.js";

export type {
  BoundariesArtifactPayload,
  BoundaryDefinition,
  ClusterArtifactPayload,
  RoleDefinition,
  RolesArtifactPayload,
} from "./contracts.js";

export const clusterBuilderNode: AnalysisNode = {
  id: "cluster-builder",
  displayName: "Cluster Builder",
  binding: "agnostic",
  requires: {
    allOf: ["structural.graph"],
  },
  produces: ["structural.cluster", "structural.roles", "structural.boundaries"],
  detect: () => true,
  async run(context) {
    const graph = context.inputArtifacts.find((artifact) => artifact.type === "structural.graph")
      ?.payload as GraphArtifactPayload | undefined;
    const payload = graph ?? { nodes: [], edges: [] };
    const clusterByPath: Record<string, string> = {};
    const clusters: Record<string, string[]> = {};

    for (const path of payload.nodes) {
      const cluster = inferClusterName(context.repositoryRoot, path);
      clusterByPath[path] = cluster;
      clusters[cluster] = [...(clusters[cluster] ?? []), path].sort();
    }

    const roles = Object.entries(clusters).map(([role, paths]) => ({
      role,
      paths,
    }));
    const boundaries = Object.keys(clusters).map((role) => ({
      role,
      allowedRoles: [role],
    }));

    return [
      {
        type: "structural.cluster",
        scope: {
          kind: "paths",
          paths: payload.nodes,
        },
        payload: {
          clusterByPath,
          clusters,
        } satisfies ClusterArtifactPayload,
      },
      {
        type: "structural.roles",
        scope: {
          kind: "paths",
          paths: payload.nodes,
        },
        payload: {
          roles,
        } satisfies RolesArtifactPayload,
      },
      {
        type: "structural.boundaries",
        scope: {
          kind: "paths",
          paths: payload.nodes,
        },
        payload: {
          clusterByPath,
          boundaries,
        } satisfies BoundariesArtifactPayload,
      },
    ];
  },
};

function inferClusterName(repositoryRoot: string, path: string): string {
  const relativePath = relative(repositoryRoot, path).replaceAll("\\", "/");
  const segments = relativePath.split("/");

  if (segments[0] === "packages" && segments.length >= 3) {
    return `${segments[1]}/${segments[2]}`;
  }

  return segments[0] ?? "repository";
}
