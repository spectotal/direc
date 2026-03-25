import { resolve } from "node:path";
import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import {
  type ArchitectureDriftContext,
  VIOLATION_CATEGORIES,
  FINDING_SCOPES,
} from "../types/index.js";

export function createConfigFinding(
  repositoryRoot: string,
  fingerprintSuffix: string,
  message: string,
  details: Record<string, unknown>,
  context: ArchitectureDriftContext,
): AnalyzerFinding {
  return {
    fingerprint: `architecture-config:${fingerprintSuffix}`,
    analyzerId: context.analyzerId,
    facetId: context.facetId,
    severity: "error",
    category: VIOLATION_CATEGORIES.INVALID_ROLE_CONFIG,
    message,
    scope: {
      kind: FINDING_SCOPES.REPOSITORY,
      path: resolve(repositoryRoot),
    },
    details,
  };
}
