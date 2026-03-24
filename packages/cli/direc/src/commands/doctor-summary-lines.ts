import type { DoctorReport } from "./doctor-helpers.js";
import { createDoctorEnvironmentLines } from "./doctor-environment-lines.js";

export function createDoctorSummaryLines(report: DoctorReport): string[] {
  const lines = [`Workspace: ${report.repositoryRoot}`];

  for (const check of report.checks) {
    lines.push(`${check.ok ? "OK" : "MISS"} ${check.label}: ${check.path}`);
  }

  lines.push(...createDoctorEnvironmentLines(report));
  return lines;
}
