import type { AutomationDispatchResult } from "direc-automation-runtime";

export function formatAutomationDispatch(result: AutomationDispatchResult): string {
  if (!result.triggered) {
    return `automation: skipped (${result.skippedReason ?? "event not configured"})`;
  }

  return [
    `automation: [${result.result?.verdict ?? "inform"}] ${result.result?.summary ?? "completed"}`,
    `automation request: ${result.requestPath ?? "not persisted"}`,
    `automation result: ${result.resultPath ?? "not persisted"}`,
    ...(result.latestPath ? [`automation latest: ${result.latestPath}`] : []),
  ].join("\n");
}
