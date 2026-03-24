import type { AnalyzerPlugin } from "direc-analysis-runtime";
import { createJsArchitectureDriftPlugin } from "direc-plugin-js-architecture-drift";
import { createJsComplexityPlugin } from "direc-plugin-js-complexity";

export function getRegisteredAnalyzers(): AnalyzerPlugin[] {
  return [
    createJsComplexityPlugin() as AnalyzerPlugin,
    createJsArchitectureDriftPlugin() as AnalyzerPlugin,
  ];
}
