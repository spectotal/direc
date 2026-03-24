import type { QualityRoutineExecutionResult, QualityRoutineParseResult } from "./types.js";
import { createRepositoryFinding, normalizeFindingPath } from "./helpers.js";

export function parseFormatterOutput(
  analyzerId: string,
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const findings = `${execution.stdout}\n${execution.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("1 file left unchanged"))
    .map((line) => line.replace(/^Would reformat\s+/, "").replace(/^would reformat\s+/, ""))
    .filter((line) => line !== "Oh no!" && line !== "1 file would be reformatted")
    .map((path, index) => ({
      fingerprint: `${analyzerId}:${path}:${index}`,
      analyzerId,
      severity: "warning" as const,
      category: "format",
      message: `${path} is not formatted according to ${analyzerId.replace("routine:", "")}.`,
      scope: {
        kind: "file" as const,
        path: normalizeFindingPath(repositoryRoot, path),
      },
    }));

  return {
    findings,
    metrics: {
      exitCode: execution.exitCode,
      fileCount: findings.length,
    },
    rawOutput: {
      stdout: execution.stdout,
      stderr: execution.stderr,
    },
  };
}

export function fallbackRoutineFailure(
  routineName: string,
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  return {
    findings:
      execution.exitCode === 0
        ? []
        : [
            createRepositoryFinding({
              analyzerId: `routine:${routineName}`,
              severity: "error",
              category: "quality-routine-failed",
              message: `${routineName} exited with code ${execution.exitCode}.`,
              repositoryRoot,
            }),
          ],
    metrics: {
      exitCode: execution.exitCode,
    },
    metadata: {
      targetPaths: execution.targetPaths,
      scopedToEventPaths: execution.scopedToEventPaths,
    },
    rawOutput: {
      stdout: execution.stdout,
      stderr: execution.stderr,
    },
  };
}
