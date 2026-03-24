#!/usr/bin/env node

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  const request = JSON.parse(input || "{}");
  const findingCount = request?.analyzerSummary?.findingCount ?? 0;
  const errorCount = request?.analyzerSummary?.severityCounts?.error ?? 0;
  const topFinding = request?.analyzerSummary?.topFindings?.[0];

  let verdict = "inform";
  let summary = `Reviewed ${request?.trigger?.eventType ?? "workflow event"} with ${findingCount} analyzer finding(s).`;
  let workOrder;
  let executionOutcome;

  if (request?.role === "gatekeeper" && errorCount > 0) {
    verdict = "block";
    summary = `Blocking due to ${errorCount} error-level analyzer finding(s).`;
  } else if (request?.role === "worker") {
    verdict = "proceed";
    summary = `Prepared bounded work for ${findingCount} analyzer finding(s).`;
    workOrder = {
      title: `Follow up on ${request?.trigger?.eventType ?? "workflow event"}`,
      summary:
        findingCount > 0
          ? `Start with: ${topFinding?.message ?? "Review the latest analyzer findings."}`
          : "Review the updated workflow context and continue implementation.",
      allowedPaths: request?.execution?.constraints?.allowedPaths ?? [],
    };
    executionOutcome = {
      started: false,
      completed: false,
      summary: "Bundled stub backend does not perform code changes.",
    };
  }

  process.stdout.write(
    `${JSON.stringify({
      requestId: request?.id,
      timestamp: new Date().toISOString(),
      status: "success",
      verdict,
      summary,
      findings:
        topFinding && typeof topFinding === "object"
          ? [
              {
                severity: topFinding.severity ?? "info",
                category: topFinding.category ?? "automation-summary",
                message: topFinding.message ?? "Analyzer reported a finding.",
                path: topFinding.path,
              },
            ]
          : [],
      workOrder,
      executionOutcome,
    })}\n`,
  );
});
