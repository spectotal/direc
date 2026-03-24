import type { RuntimeExecutionResult } from "@spectotal/direc-analysis-runtime";
import type { SubagentAnalyzerSummary } from "./types.js";

export function buildAnalyzerSummary(result: RuntimeExecutionResult): SubagentAnalyzerSummary {
  const findings = result.runs.flatMap((run) => run.snapshot?.findings ?? []);
  const matchedPaths = new Set<string>(result.event.pathScopes ?? []);

  for (const finding of findings) {
    if (finding.scope.path) {
      matchedPaths.add(finding.scope.path);
    }
  }

  return {
    enabledAnalyzers: result.resolution.enabled.map((entry) => entry.plugin.id),
    successfulRuns: result.runs.filter((run) => run.status === "success").length,
    failedRuns: result.runs.filter((run) => run.status === "failed").length,
    findingCount: findings.length,
    severityCounts: findings.reduce(
      (counts, finding) => {
        counts[finding.severity] += 1;
        return counts;
      },
      { info: 0, warning: 0, error: 0 },
    ),
    topFindings: findings.slice(0, 8).map((finding) => ({
      analyzerId: finding.analyzerId,
      severity: finding.severity,
      category: finding.category,
      message: finding.message,
      path: finding.scope.path,
    })),
    reports: result.runs.map((run) => ({
      analyzerId: run.analyzerId,
      findingCount: run.snapshot?.findings.length ?? 0,
      latestPath: run.latestPath,
      status: run.status,
    })),
    matchedPaths: [...matchedPaths],
  };
}
