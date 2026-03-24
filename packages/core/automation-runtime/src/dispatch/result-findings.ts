import type { SubagentResult } from "../types.js";
import { asString, isRecord } from "./payload.js";

export function normalizeResultFindings(value: unknown): SubagentResult["findings"] {
  return Array.isArray(value) ? value.flatMap(normalizeResultFinding) : [];
}

function normalizeResultFinding(value: unknown): SubagentResult["findings"] {
  if (!isRecord(value)) {
    return [];
  }

  const severity = normalizeFindingSeverity(value.severity);
  const category = asString(value.category);
  const message = asString(value.message);

  if (!severity || !category || !message) {
    return [];
  }

  return [
    {
      severity,
      category,
      message,
      path: asString(value.path),
    },
  ];
}

function normalizeFindingSeverity(
  value: unknown,
): SubagentResult["findings"][number]["severity"] | undefined {
  return value === "info" || value === "warning" || value === "error" ? value : undefined;
}
