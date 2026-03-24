import type { AnalyzerFinding } from "direc-analysis-runtime";
import { normalizeFindingPath } from "./helpers.js";
import type { QualityRoutineExecutionResult, QualityRoutineParseResult } from "./types.js";

export function parsePrettierOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const lines = `${execution.stdout}\n${execution.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("Checking formatting"));

  const fileLines = lines
    .map((line) => line.replace(/^\[warn\]\s*/, ""))
    .filter((line) => !line.startsWith("[warn] Code style issues"));
  const findings = fileLines
    .filter((line) => line !== "[warn]" && !line.startsWith("All matched files use"))
    .map(
      (line, index) =>
        ({
          fingerprint: `routine:prettier:${line}:${index}`,
          analyzerId: "routine:prettier",
          severity: "warning",
          category: "format",
          message: `${line} is not formatted according to Prettier.`,
          scope: {
            kind: "file",
            path: normalizeFindingPath(repositoryRoot, line),
          },
        }) satisfies AnalyzerFinding,
    );

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

export function parseTypescriptDiagnostics(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): AnalyzerFinding[] {
  return `${execution.stdout}\n${execution.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const match =
        line.match(/^(.*)\((\d+),(\d+)\): error TS\d+: (.*)$/) ??
        line.match(/^(.*):(\d+):(\d+) - error TS\d+: (.*)$/);

      if (!match) {
        return [];
      }

      const filePath = match[1];
      const message = match[4];

      if (!filePath || !message) {
        return [];
      }

      return [
        {
          fingerprint: `routine:typescript:${filePath}:${index}`,
          analyzerId: "routine:typescript",
          facetId: "js",
          severity: "error",
          category: "typecheck",
          message,
          scope: {
            kind: "file",
            path: normalizeFindingPath(repositoryRoot, filePath),
          },
        } satisfies AnalyzerFinding,
      ];
    });
}
