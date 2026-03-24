import type { RuntimeExecutionResult } from "@spectotal/direc-analysis-runtime";

export function buildReportLines(result: RuntimeExecutionResult): string[] {
  return result.runs
    .filter((run) => run.status === "success")
    .map((run) => {
      const findingCount = run.snapshot?.findings.length ?? 0;
      return `- ${run.analyzerId}: ${findingCount} finding(s) -> ${run.latestPath ?? "no latest report path"}`;
    });
}

export function buildFailureLines(result: RuntimeExecutionResult): string[] {
  return result.runs
    .filter((run) => run.status === "failed")
    .map((run) => `- ${run.analyzerId}: ${run.errorMessage ?? "unknown error"}`);
}

export function buildFindingLines(result: RuntimeExecutionResult): string[] {
  return result.runs
    .flatMap((run) => run.snapshot?.findings ?? [])
    .slice(0, 8)
    .map(
      (finding) =>
        `- [${finding.severity}] ${finding.category}: ${finding.message}${formatFindingScope(finding.scope.path)}`,
    );
}

function formatFindingScope(path: string | undefined): string {
  if (!path) {
    return "";
  }

  return ` (${path})`;
}
