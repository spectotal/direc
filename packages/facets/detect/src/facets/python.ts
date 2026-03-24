import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, type DetectedFacet } from "direc-analysis-runtime";
import type { RepositoryScan } from "../types.js";
import { compactEvidence, describeRoots } from "../utils.js";

export function detectPythonFacet(scan: RepositoryScan): DetectedFacet | null {
  if (scan.pythonSourcePaths.length === 0 && scan.pythonConfigPaths.length === 0) {
    return null;
  }

  return {
    id: "python",
    confidence:
      scan.analyzablePythonSourcePaths.length > 0 && scan.pythonConfigPaths.length > 0
        ? "high"
        : "medium",
    evidence: compactEvidence([
      scan.pythonConfigPaths.length > 0
        ? `Found Python configuration files: ${scan.pythonConfigPaths.slice(0, 4).join(", ")}.`
        : null,
      scan.analyzablePythonSourcePaths.length > 0
        ? `Found analyzable Python source files under ${describeRoots(scan.analyzablePythonSourcePaths)}.`
        : scan.pythonSourcePaths.length > 0
          ? `Filtered ${scan.pythonSourcePaths.length - scan.analyzablePythonSourcePaths.length} non-production Python path(s) from default analyzer scope.`
          : null,
    ]),
    metadata: {
      sourcePaths: scan.analyzablePythonSourcePaths,
      configPaths: scan.pythonConfigPaths,
      excludedSourcePatterns: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
    },
  };
}
