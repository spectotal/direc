import { isWorkflowId, normalizeWorkflowId } from "@spectotal/direc-workflow-runtime";
import { normalizeAutomationConfig } from "./automation-config-normalization.js";
import { normalizeQualityRoutines } from "./quality-routine-config-normalization.js";
import type { DirecConfig } from "./types.js";

export function normalizeDirecConfig(config: Record<string, unknown>): DirecConfig {
  const automation = normalizeAutomationConfig(config.automation);
  const workflow =
    typeof config.workflow === "undefined"
      ? normalizeWorkflowId(config.workflow)
      : isWorkflowId(config.workflow)
        ? config.workflow
        : failUnsupportedWorkflow(config.workflow);

  return {
    ...config,
    version: 1,
    generatedAt:
      typeof config.generatedAt === "string" ? config.generatedAt : new Date().toISOString(),
    workflow,
    facets: Array.isArray(config.facets) ? config.facets.filter(isString) : [],
    extensions: Array.isArray(config.extensions) ? config.extensions.filter(isString) : undefined,
    qualityRoutines: normalizeQualityRoutines(config.qualityRoutines),
    analyzers: isRecord(config.analyzers) ? (config.analyzers as DirecConfig["analyzers"]) : {},
    ...(automation ? { automation } : {}),
  } satisfies DirecConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function failUnsupportedWorkflow(value: unknown): never {
  throw new Error(`Unsupported workflow in .direc/config.json: ${String(value)}`);
}
