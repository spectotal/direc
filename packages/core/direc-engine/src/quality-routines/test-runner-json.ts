import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { isRecord, normalizeFindingPath, safeJsonParse } from "./helpers.js";

export function parseJsonTestResults(options: {
  repositoryRoot: string;
  analyzerId: string;
  stdout: string;
  exitCode: number;
}): {
  findings: AnalyzerFinding[];
  rawOutput?: Record<string, unknown>;
} | null {
  const parsedJson = safeJsonParse<Record<string, unknown>>(options.stdout.trim());

  if (!(isRecord(parsedJson) && Array.isArray(parsedJson.testResults))) {
    return null;
  }

  const findings = parsedJson.testResults.flatMap((result, fileIndex) => {
    if (!isRecord(result) || typeof result.name !== "string") {
      return [];
    }

    const resultName = result.name;
    const assertionResults = Array.isArray(result.assertionResults) ? result.assertionResults : [];
    const failedAssertions = assertionResults.filter(
      (entry) => isRecord(entry) && entry.status === "failed",
    );

    if (failedAssertions.length === 0 && result.status !== "failed") {
      return [];
    }

    return failedAssertions.length > 0
      ? failedAssertions.map((entry, assertionIndex) => {
          const title = isRecord(entry) && typeof entry.title === "string" ? entry.title : null;

          return {
            fingerprint: `${options.analyzerId}:${resultName}:${assertionIndex}`,
            analyzerId: options.analyzerId,
            severity: "error" as const,
            category: "test-failure",
            message: title ?? `A test failed in ${resultName}.`,
            scope: {
              kind: "file" as const,
              path: normalizeFindingPath(options.repositoryRoot, resultName),
            },
          };
        })
      : [
          {
            fingerprint: `${options.analyzerId}:${resultName}:${fileIndex}`,
            analyzerId: options.analyzerId,
            severity: "error" as const,
            category: "test-failure",
            message: `Tests failed in ${resultName}.`,
            scope: {
              kind: "file" as const,
              path: normalizeFindingPath(options.repositoryRoot, resultName),
            },
          } satisfies AnalyzerFinding,
        ];
  });

  return {
    findings,
    rawOutput: parsedJson,
  };
}
