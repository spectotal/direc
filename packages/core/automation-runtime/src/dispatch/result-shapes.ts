import type { SubagentResult } from "../types.js";
import { asBoolean, asString, asStringArray, isRecord } from "./payload.js";

export function normalizeWorkOrder(value: unknown): SubagentResult["workOrder"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const title = asString(value.title);
  const summary = asString(value.summary);

  if (!title || !summary) {
    return undefined;
  }

  return {
    title,
    summary,
    allowedPaths: asStringArray(value.allowedPaths) ?? [],
    suggestedCommands: asStringArray(value.suggestedCommands),
  };
}

export function normalizeExecutionOutcome(
  value: unknown,
): SubagentResult["executionOutcome"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    started: asBoolean(value.started),
    completed: asBoolean(value.completed),
    summary: asString(value.summary),
    changedPaths: asStringArray(value.changedPaths),
  };
}
