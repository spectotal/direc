import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { isRecord, normalizeFindingPath, safeJsonParse } from "./helpers.js";
import { fallbackRoutineFailure } from "./generic-parsers.js";
import type { QualityRoutineExecutionResult, QualityRoutineParseResult } from "./types.js";

export function parseEslintOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const output = execution.stdout.trim() || execution.stderr.trim();
  const parsed = safeJsonParse<unknown[]>(output);

  if (!Array.isArray(parsed)) {
    return fallbackRoutineFailure("eslint", repositoryRoot, execution);
  }

  const findings = parsed.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.filePath !== "string" || !Array.isArray(entry.messages)) {
      return [];
    }
    const filePath = entry.filePath;

    return entry.messages.flatMap((message, index) => {
      if (!isRecord(message) || typeof message.message !== "string") {
        return [];
      }

      const severity = message.severity === 2 ? "error" : "warning";

      return [
        {
          fingerprint: `routine:eslint:${filePath}:${message.ruleId ?? index}`,
          analyzerId: "routine:eslint",
          facetId: "js",
          severity,
          category: "lint",
          message: message.message,
          scope: {
            kind: "file",
            path: normalizeFindingPath(repositoryRoot, filePath),
          },
          details: {
            ruleId: typeof message.ruleId === "string" ? message.ruleId : undefined,
            line: typeof message.line === "number" ? message.line : undefined,
            column: typeof message.column === "number" ? message.column : undefined,
          },
        } satisfies AnalyzerFinding,
      ];
    });
  });

  return {
    findings,
    metrics: {
      exitCode: execution.exitCode,
      findingCount: findings.length,
    },
    metadata: {
      targetPaths: execution.targetPaths,
      scopedToEventPaths: execution.scopedToEventPaths,
    },
    rawOutput: parsed,
  };
}
