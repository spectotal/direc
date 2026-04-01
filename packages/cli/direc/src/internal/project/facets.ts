import { extname } from "node:path";
import type { ProjectFacet } from "@spectotal/direc-artifact-contracts";

const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

export interface FacetDetectionState {
  facets: Map<string, ProjectFacet>;
  sourceFiles: string[];
  hasOpenSpec: boolean;
}

export function createFacetDetectionState(): FacetDetectionState {
  return {
    facets: new Map<string, ProjectFacet>(),
    sourceFiles: [],
    hasOpenSpec: false,
  };
}

export function recordProjectEntry(
  state: FacetDetectionState,
  filePath: string,
  entryName: string,
): void {
  const extension = extname(entryName);

  if (entryName === "package.json" || entryName === "tsconfig.json") {
    appendFacet(state.facets, "js", filePath);
  }
  if (entryName === "pyproject.toml" || extension === ".py") {
    appendFacet(state.facets, "python", filePath);
  }
  if (entryName === "openspec" && filePath.endsWith("/openspec")) {
    state.hasOpenSpec = true;
    appendFacet(state.facets, "openspec", filePath);
  }
  if (extension === ".css") {
    appendFacet(state.facets, "css", filePath);
  }
  if (entryName === "tailwind.config.js" || entryName === "tailwind.config.ts") {
    appendFacet(state.facets, "tailwind", filePath);
  }
  if (JS_EXTENSIONS.has(extension)) {
    state.sourceFiles.push(filePath);
  }
}

export function sortProjectFacets(facets: Map<string, ProjectFacet>): ProjectFacet[] {
  return [...facets.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function appendFacet(map: Map<string, ProjectFacet>, id: string, evidencePath: string): void {
  const existing = map.get(id);
  if (existing) {
    existing.evidence.push(evidencePath);
    return;
  }

  map.set(id, {
    id,
    evidence: [evidencePath],
  });
}
