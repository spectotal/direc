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
  return {
    ok: true,
    summary: "Built-in AST analyzer uses native typescript resolution implicitly.",
  };
}
