import type { AnalyzerFinding } from "direc-analysis-runtime";
import { normalizeFindingPath } from "./helpers.js";

export function parseTextTestFailures(options: {
  repositoryRoot: string;
  analyzerId: string;
  stdout: string;
  stderr: string;
}): AnalyzerFinding[] {
  return `${options.stdout}\n${options.stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("FAILED "))
    .map((line, index) => {
      const scopePath = line.split("::")[0]?.replace(/^FAILED\s+/, "") ?? "";
      return {
        fingerprint: `${options.analyzerId}:${scopePath}:${index}`,
        analyzerId: options.analyzerId,
        severity: "error",
        category: "test-failure",
        message: line,
        scope: scopePath
          ? {
              kind: "file" as const,
              path: normalizeFindingPath(options.repositoryRoot, scopePath),
            }
          : { kind: "repository" as const },
      } satisfies AnalyzerFinding;
    });
}
