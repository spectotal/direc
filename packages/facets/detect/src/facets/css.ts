import type { DetectedFacet } from "direc-analysis-runtime";
import type { RepositoryScan } from "../types.js";
import { describeRoots } from "../utils.js";

export function detectCssFacet(scan: RepositoryScan): DetectedFacet | null {
  if (scan.cssPaths.length === 0) {
    return null;
  }

  return {
    id: "css",
    confidence: "high",
    evidence: [`Found CSS-related files under ${describeRoots(scan.cssPaths)}.`],
    metadata: {
      stylePaths: scan.cssPaths,
    },
  };
}
