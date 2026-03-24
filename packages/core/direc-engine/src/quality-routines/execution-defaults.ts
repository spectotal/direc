import type { QualityRoutineCommandConfig } from "@spectotal/direc-analysis-runtime";
import { createRepositoryFinding } from "./helpers.js";
import type { QualityRoutineExecutionResult, QualityRoutineParseResult } from "./types.js";

export function assertQualityRoutineCommand(
  routineName: string,
  command: QualityRoutineCommandConfig | undefined,
): QualityRoutineCommandConfig {
  if (!command?.command) {
    throw new Error(`Quality routine ${routineName} is missing command.command.`);
  }

  return command;
}

export function createFallbackRunResult(
  repositoryRoot: string,
  routineName: string,
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
      stdout: execution.stdout,
      stderr: execution.stderr,
      targetPaths: execution.targetPaths,
      scopedToEventPaths: execution.scopedToEventPaths,
    },
    rawOutput: {
      stdout: execution.stdout,
      stderr: execution.stderr,
    },
  };
}
