import {
  DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  type DetectedFacet,
} from "@spectotal/direc-analysis-runtime";
import type { RepositoryScan } from "../types.js";
import { compactEvidence, describeRoots } from "../utils.js";

export function detectJsFacet(scan: RepositoryScan): DetectedFacet | null {
  if (
    scan.packageBoundaries.length === 0 &&
    scan.tsconfigPaths.length === 0 &&
    scan.nodeSourcePaths.length === 0
  ) {
    return null;
  }

  return {
    id: "js",
    confidence:
      scan.packageBoundaries.length > 0 && scan.tsconfigPaths.length > 0 ? "high" : "medium",
    evidence: compactEvidence([
      scan.packageBoundaries.length > 0
        ? `Detected ${scan.packageBoundaries.length} package boundary candidate(s).`
        : null,
      scan.tsconfigPaths.length > 0
        ? `Found TypeScript configuration files: ${scan.tsconfigPaths.slice(0, 3).join(", ")}.`
        : null,
      scan.analyzableNodeSourcePaths.length > 0
        ? `Found analyzable JavaScript/TypeScript source files under ${describeRoots(
            scan.analyzableNodeSourcePaths,
          )}.`
        : scan.nodeSourcePaths.length > 0
          ? `Filtered ${scan.nodeSourcePaths.length - scan.analyzableNodeSourcePaths.length} non-production JavaScript/TypeScript path(s) from default analyzer scope.`
          : null,
    ]),
    metadata: {
      packageBoundaries: scan.packageBoundaries,
      tsconfigPaths: scan.tsconfigPaths,
      sourcePaths: scan.analyzableNodeSourcePaths,
      excludedSourcePatterns: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
    },
  };
}
