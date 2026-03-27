import { relative } from "node:path";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";

export const clusterBuilderNode: AnalysisNode = {
  id: "cluster-builder",
  displayName: "Cluster Builder",
  selector: {
    allOf: ["structural.graph"],
  },
  produces: ["structural.cluster", "structural.roles", "structural.boundaries"],
  detect: () => true,
  async run(context) {
    const graph = context.inputArtifacts.find((artifact) => artifact.type === "structural.graph");
    const payload = (graph?.payload as
      | {
          nodes?: string[];
        }
      | undefined) ?? { nodes: [] };
    const clusterByPath: Record<string, string> = {};
    const clusters: Record<string, string[]> = {};

    for (const path of payload.nodes ?? []) {
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
          paths: payload.nodes ?? [],
        },
        payload: {
          clusterByPath,
          clusters,
        },
      },
      {
        type: "structural.roles",
        scope: {
          kind: "paths",
          paths: payload.nodes ?? [],
        },
        payload: {
          roles,
        },
      },
      {
        type: "structural.boundaries",
        scope: {
          kind: "paths",
          paths: payload.nodes ?? [],
        },
        payload: {
          clusterByPath,
          boundaries,
        },
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
