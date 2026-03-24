import type { AnalyzerPrerequisiteResult } from "@spectotal/direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS } from "@spectotal/direc-analysis-runtime";
import type { ArchitectureDriftPluginOptions } from "./types.js";

export function createDefaultOptions(): ArchitectureDriftPluginOptions {
  return {
    excludePaths: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
    moduleRoles: [],
    roleBoundaryRules: [],
  };
}

export async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
  try {
    await import("madge");
    return {
      ok: true,
      summary: "madge is available.",
    };
  } catch (error) {
    return {
      ok: false,
      summary: "madge is not available.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
