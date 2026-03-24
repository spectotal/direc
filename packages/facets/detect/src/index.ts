import type { DetectedFacet } from "direc-analysis-runtime";
import { detectCssFacet } from "./facets/css.js";
import { detectFrontendFacet } from "./facets/frontend.js";
import { detectJsFacet } from "./facets/js.js";
import { detectTailwindFacet } from "./facets/tailwind.js";
import { scanRepository } from "./scan.js";

export async function detectRepositoryFacets(repositoryRoot: string): Promise<DetectedFacet[]> {
  const scan = await scanRepository(repositoryRoot);

  return [
    detectJsFacet(scan),
    detectCssFacet(scan),
    detectFrontendFacet(scan),
    detectTailwindFacet(scan),
  ].filter((facet): facet is DetectedFacet => facet !== null);
}
