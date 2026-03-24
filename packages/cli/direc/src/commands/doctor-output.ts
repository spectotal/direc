import type { DoctorReport } from "./doctor-helpers.js";
import { createDisabledAnalyzerLines } from "./doctor-disabled-lines.js";
import { createDoctorSummaryLines } from "./doctor-summary-lines.js";

export function formatDoctorReport(report: DoctorReport): string {
  return formatLines([...createDoctorSummaryLines(report), ...createDisabledAnalyzerLines(report)]);
}

function formatLines(lines: string[]): string {
  return `${lines.join("\n")}\n`;
}
