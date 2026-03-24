import type { AnalyzerPrerequisiteResult } from "direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS } from "direc-analysis-runtime";
import type { ArchitectureDriftPluginOptions } from "./types.js";

export function createDefaultOptions(): ArchitectureDriftPluginOptions {
  return {
    excludePaths: [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS],
    boundaryRules: [],
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
