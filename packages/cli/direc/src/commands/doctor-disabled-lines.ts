import type { DoctorReport } from "./doctor-helpers.js";

export function createDisabledAnalyzerLines(report: DoctorReport): string[] {
  const lines: string[] = [];

  for (const entry of report.resolution?.disabled ?? []) {
    lines.push(
      `SKIP ${entry.pluginId}: ${entry.reasons.map((reason) => reason.message).join("; ")}`,
    );
  }

  return lines;
}
