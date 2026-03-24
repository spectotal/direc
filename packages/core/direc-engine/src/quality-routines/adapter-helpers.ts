import type { QualityRoutineConfig } from "direc-analysis-runtime";
import { fallbackRoutineFailure } from "./generic-parsers.js";
import { parseJsonTestResults } from "./test-runner-json.js";
import { parseTextTestFailures } from "./test-runner-text.js";
import type { QualityRoutineAdapter, QualityRoutineDetectionContext } from "./types.js";

export function createTestRunnerAdapter(options: {
  id: string;
  displayName: string;
  supportedFacets: string[];
  detect: (
    context: QualityRoutineDetectionContext,
  ) => Promise<QualityRoutineConfig | null> | QualityRoutineConfig | null;
}): QualityRoutineAdapter {
  return {
    id: options.id,
    displayName: options.displayName,
    supportedFacets: options.supportedFacets,
    supportsScopedPaths: true,
    detect: options.detect,
    parseRunResult(runOptions) {
      const parsed = parseJsonTestResults({
        repositoryRoot: runOptions.repositoryRoot,
        analyzerId: `routine:${options.id}`,
        stdout: runOptions.execution.stdout,
        exitCode: runOptions.execution.exitCode,
      });

      if (parsed) {
        return {
          findings: parsed.findings,
          metrics: {
            exitCode: runOptions.execution.exitCode,
            findingCount: parsed.findings.length,
          },
          rawOutput: parsed.rawOutput,
        };
      }

      const findings = parseTextTestFailures({
        repositoryRoot: runOptions.repositoryRoot,
        analyzerId: `routine:${options.id}`,
        stdout: runOptions.execution.stdout,
        stderr: runOptions.execution.stderr,
      });

      if (findings.length > 0 || runOptions.execution.exitCode === 0) {
        return {
          findings,
          metrics: {
            exitCode: runOptions.execution.exitCode,
            findingCount: findings.length,
          },
          rawOutput: {
            stdout: runOptions.execution.stdout,
            stderr: runOptions.execution.stderr,
          },
        };
      }

      return fallbackRoutineFailure(options.id, runOptions.repositoryRoot, runOptions.execution);
    },
  };
}
