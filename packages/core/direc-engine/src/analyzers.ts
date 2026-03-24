import type { AnalyzerPlugin } from "direc-analysis-runtime";
import { createJsArchitectureDriftPlugin } from "direc-plugin-js-architecture-drift";
import { createJsComplexityPlugin } from "direc-plugin-js-complexity";
import { createQualityRoutineAnalyzers, type QualityRoutineAdapter } from "./quality-routines.js";

export function getBuiltinAnalyzers(): AnalyzerPlugin[] {
  return [
    createJsComplexityPlugin() as AnalyzerPlugin,
    createJsArchitectureDriftPlugin() as AnalyzerPlugin,
  ];
}

export function getRegisteredAnalyzers(options: {
  repositoryRoot: string;
  qualityRoutines?: Record<string, import("direc-analysis-runtime").QualityRoutineConfig>;
  qualityAdapters?: QualityRoutineAdapter[];
  extensionAnalyzers?: AnalyzerPlugin[];
}): AnalyzerPlugin[] {
  const analyzers = [
    ...getBuiltinAnalyzers(),
    ...(options.extensionAnalyzers ?? []),
    ...createQualityRoutineAnalyzers({
      repositoryRoot: options.repositoryRoot,
      qualityRoutines: options.qualityRoutines,
      adapters: options.qualityAdapters ?? [],
    }),
  ];
  const seen = new Set<string>();

  for (const analyzer of analyzers) {
    if (seen.has(analyzer.id)) {
      throw new Error(`Duplicate analyzer id detected: ${analyzer.id}`);
    }

    seen.add(analyzer.id);
  }

  return analyzers;
}
