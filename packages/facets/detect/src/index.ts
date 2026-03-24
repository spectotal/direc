import type { DetectedFacet } from "@spectotal/direc-analysis-runtime";
import { detectCssFacet } from "./facets/css.js";
import { detectFrontendFacet } from "./facets/frontend.js";
import { detectJsFacet } from "./facets/js.js";
import { detectPythonFacet } from "./facets/python.js";
import { detectTailwindFacet } from "./facets/tailwind.js";
import { scanRepository } from "./scan.js";
import type { FacetDetector } from "./types.js";

export type { FacetDetector, PackageManifest, RepositoryScan } from "./types.js";
export { scanRepository } from "./scan.js";

const BUILTIN_DETECTORS: FacetDetector[] = [
  detectJsFacet,
  detectPythonFacet,
  detectCssFacet,
  detectFrontendFacet,
  detectTailwindFacet,
];

export async function detectRepositoryFacets(
  repositoryRoot: string,
  options: {
    detectors?: FacetDetector[];
  } = {},
): Promise<DetectedFacet[]> {
  const scan = await scanRepository(repositoryRoot);

  const detectors = [...BUILTIN_DETECTORS, ...(options.detectors ?? [])];
  const results: DetectedFacet[] = [];
  const seen = new Set<string>();

  for (const detector of detectors) {
    const facet = detector(scan);

    if (!facet) {
      continue;
    }

    if (seen.has(facet.id)) {
      throw new Error(`Duplicate facet id detected: ${facet.id}`);
    }

    seen.add(facet.id);
    results.push(facet);
  }

  return results;
}
