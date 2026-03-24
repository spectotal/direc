import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { isRecord, normalizeFindingPath, safeJsonParse } from "./helpers.js";
import { fallbackRoutineFailure, parseFormatterOutput } from "./generic-parsers.js";
import type { QualityRoutineExecutionResult, QualityRoutineParseResult } from "./types.js";

export function parseRuffOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const parsed = safeJsonParse<unknown[]>(execution.stdout.trim());

  if (!Array.isArray(parsed)) {
    return fallbackRoutineFailure("ruff", repositoryRoot, execution);
  }

  const findings = parsed.flatMap((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.filename !== "string" ||
      typeof entry.message !== "string"
    ) {
      return [];
    }

    return [
      {
        fingerprint: `routine:ruff:${entry.filename}:${entry.code ?? index}`,
        analyzerId: "routine:ruff",
        facetId: "python",
        severity: "error",
        category: "lint",
        message: entry.message,
        scope: {
          kind: "file",
          path: normalizeFindingPath(repositoryRoot, entry.filename),
        },
        details: {
          code: typeof entry.code === "string" ? entry.code : undefined,
        },
      } satisfies AnalyzerFinding,
    ];
  });

  return {
    findings,
    metrics: {
      exitCode: execution.exitCode,
      findingCount: findings.length,
    },
    rawOutput: parsed,
  };
}

export function parseRuffFormatOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  return parseFormatterOutput("routine:ruff-format", repositoryRoot, execution);
}

export function parseBlackOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const findings = `${execution.stdout}\n${execution.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("would reformat "))
    .map((line, index) => {
      const path = line.replace("would reformat ", "");
      return {
        fingerprint: `routine:black:${path}:${index}`,
        analyzerId: "routine:black",
        facetId: "python",
        severity: "warning",
        category: "format",
        message: `${path} is not formatted according to Black.`,
        scope: {
          kind: "file",
          path: normalizeFindingPath(repositoryRoot, path),
        },
      } satisfies AnalyzerFinding;
    });

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

export function parseMypyOutput(
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  const findings = `${execution.stdout}\n${execution.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const match =
        line.match(/^(.*):(\d+):(?:\s*error:\s*)(.*)$/) ??
        line.match(/^(.*):(\d+):(\d+):(?:\s*error:\s*)(.*)$/);

      if (!match) {
        return [];
      }

      const filePath = match[1];
      const message = match.at(-1) ?? line;

      return [
        {
          fingerprint: `routine:mypy:${filePath}:${index}`,
          analyzerId: "routine:mypy",
          facetId: "python",
          severity: "error",
          category: "typecheck",
          message,
          scope: {
            kind: "file",
            path: normalizeFindingPath(repositoryRoot, String(filePath)),
          },
        } satisfies AnalyzerFinding,
      ];
    });

  return {
    findings,
    metrics: {
      exitCode: execution.exitCode,
      findingCount: findings.length,
    },
    rawOutput: {
      stdout: execution.stdout,
      stderr: execution.stderr,
    },
  };
}
