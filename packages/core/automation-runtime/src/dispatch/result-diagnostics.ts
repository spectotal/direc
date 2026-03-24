import type { SubagentResult } from "../types.js";
import { asNumber, asString, isRecord } from "./payload.js";

export function mergeDiagnostics(
  value: unknown,
  diagnostics: NonNullable<SubagentResult["diagnostics"]>,
): NonNullable<SubagentResult["diagnostics"]> {
  if (!isRecord(value)) {
    return diagnostics;
  }

  return {
    ...diagnostics,
    durationMs: asNumber(value.durationMs) ?? diagnostics.durationMs,
    exitCode: asNumber(value.exitCode) ?? diagnostics.exitCode,
    statusCode: asNumber(value.statusCode) ?? diagnostics.statusCode,
    stderr: asString(value.stderr) ?? diagnostics.stderr,
    error: asString(value.error) ?? diagnostics.error,
  };
}
