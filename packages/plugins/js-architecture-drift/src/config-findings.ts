import { resolve } from "node:path";
import type { AnalyzerFinding } from "direc-analysis-runtime";

export function createConfigFinding(
  repositoryRoot: string,
  fingerprintSuffix: string,
  message: string,
  details: Record<string, unknown>,
): AnalyzerFinding {
  return {
    fingerprint: `architecture-config:${fingerprintSuffix}`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error",
    category: "invalid-role-config",
    message,
    scope: {
      kind: "repository",
      path: resolve(repositoryRoot),
    },
    details,
  };
}
