import type { DoctorReport } from "./doctor-helpers.js";

export function createDoctorEnvironmentLines(report: DoctorReport): string[] {
  if (!report.config || !report.environment || !report.resolution) {
    return ["MISS analyzer resolution: missing .direc/config.json"];
  }

  return [
    `Facets: ${report.environment.detectedFacets.map((facet) => facet.id).join(", ") || "none"}`,
    `Workflow: ${report.config.workflow}`,
    `Configured analyzers: ${collectConfiguredAnalyzerIds(report).join(", ") || "none"}`,
    `Runnable analyzers: ${collectRunnableAnalyzerIds(report).join(", ") || "none"}`,
    `Quality routines: ${Object.keys(report.config.qualityRoutines ?? {}).join(", ") || "none"}`,
    `Extensions: ${report.environment.extensionSources.join(", ") || "none"}`,
    formatAutomationLine(report),
  ];
}

function collectConfiguredAnalyzerIds(report: DoctorReport): string[] {
  const analyzerIds: string[] = [];

  for (const [analyzerId, entry] of Object.entries(report.config?.analyzers ?? {})) {
    if (entry.enabled !== false) {
      analyzerIds.push(analyzerId);
    }
  }

  return analyzerIds;
}

function collectRunnableAnalyzerIds(report: DoctorReport): string[] {
  const analyzerIds: string[] = [];

  for (const entry of report.resolution?.enabled ?? []) {
    analyzerIds.push(entry.plugin.id);
  }

  return analyzerIds;
}

function formatAutomationLine(report: DoctorReport): string {
  if (report.config?.automation) {
    return `Automation: ${report.config.automation.mode}, ${report.config.automation.invocation}, ${report.config.automation.transport.kind}`;
  }

  return "MISS automation config: re-run `direc init --force` to seed automation defaults";
}
