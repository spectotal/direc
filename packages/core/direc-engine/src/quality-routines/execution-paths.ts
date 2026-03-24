import { relative } from "node:path";
import type { DetectedFacet } from "direc-analysis-runtime";

export function resolveScopedPaths(
  repositoryRoot: string,
  eventPathScopes: string[],
  detectedFacets: DetectedFacet[],
  supportedFacets: string[],
): string[] {
  if (eventPathScopes.length > 0) {
    return eventPathScopes.map((path) => relative(repositoryRoot, path));
  }

  for (const facetId of supportedFacets) {
    const sourcePaths = readFacetSourcePaths(detectedFacets, facetId);

    if (sourcePaths.length > 0) {
      return [...new Set(sourcePaths)].sort();
    }
  }

  return [];
}

function readFacetSourcePaths(detectedFacets: DetectedFacet[], facetId: string): string[] {
  const facet = detectedFacets.find((entry) => entry.id === facetId);

  if (Array.isArray(facet?.metadata.sourcePaths)) {
    return facet.metadata.sourcePaths as string[];
  }

  return [];
}
