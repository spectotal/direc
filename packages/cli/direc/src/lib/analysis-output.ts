import type { DetectedFacet, RuntimeExecutionResult } from "@spectotal/direc-analysis-runtime";
import { buildFailureLines, buildFindingLines, buildReportLines } from "./analysis-output-lines.js";

export function formatAnalysisResult(result: RuntimeExecutionResult): string {
  const changeId = result.event.change?.id ?? "repository";
  const successful = result.runs.filter((run) => run.status === "success").length;
  const failed = result.runs.filter((run) => run.status === "failed").length;
  const findings = result.runs.reduce(
    (count, run) => count + (run.snapshot?.findings.length ?? 0),
    0,
  );
  const reportLines = buildReportLines(result);
  const failureLines = buildFailureLines(result);
  const findingLines = buildFindingLines(result);

  return [
    `Processed ${result.event.type} for ${changeId}`,
    `enabled analyzers: ${result.resolution.enabled.map((entry) => entry.plugin.id).join(", ") || "none"}`,
    `runs: ${successful} successful, ${failed} failed`,
    `findings: ${findings}`,
    ...(reportLines.length > 0 ? ["reports:", ...reportLines] : []),
    ...(findingLines.length > 0 ? ["top findings:", ...findingLines] : []),
    ...(findings > findingLines.length
      ? [`...and ${findings - findingLines.length} more finding(s) in the JSON reports.`]
      : []),
    ...(failureLines.length > 0 ? ["failures:", ...failureLines] : []),
    "",
  ].join("\n");
}

export function formatFacetList(detectedFacets: DetectedFacet[]): string {
  return detectedFacets.map((facet) => facet.id).join(", ") || "none";
}
