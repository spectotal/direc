import type { AnalyzerPlugin } from "direc-analysis-runtime";
import type { FacetDetector } from "direc-facet-detect";
import type { QualityRoutineAdapter } from "./quality-routines.js";
import { normalizeExtensionModule, resolveExtensionSpecifier } from "./extensions-helpers.js";
export type { DirecExtensionModule, LoadedDirecExtensions } from "./extension-types.js";
import type { LoadedDirecExtensions } from "./extension-types.js";

export async function loadDirecExtensions(options: {
  repositoryRoot: string;
  sources?: string[];
}): Promise<LoadedDirecExtensions> {
  const uniqueSources = [...new Set(options.sources ?? [])];
  const analyzers: AnalyzerPlugin[] = [];
  const facetDetectors: FacetDetector[] = [];
  const qualityAdapters: QualityRoutineAdapter[] = [];
  const analyzerIds = new Set<string>();
  const adapterIds = new Set<string>();

  for (const source of uniqueSources) {
    const loaded = await import(resolveExtensionSpecifier(options.repositoryRoot, source));
    const moduleValue = normalizeExtensionModule(loaded);

    for (const analyzer of moduleValue.analyzers ?? []) {
      if (analyzerIds.has(analyzer.id)) {
        throw new Error(`Duplicate analyzer id detected: ${analyzer.id}`);
      }

      analyzerIds.add(analyzer.id);
      analyzers.push(analyzer);
    }

    for (const adapter of moduleValue.qualityAdapters ?? []) {
      if (adapterIds.has(adapter.id)) {
        throw new Error(`Duplicate quality adapter id detected: ${adapter.id}`);
      }

      adapterIds.add(adapter.id);
      qualityAdapters.push(adapter);
    }

    facetDetectors.push(...(moduleValue.facetDetectors ?? []));
  }

  return {
    sources: uniqueSources,
    analyzers,
    facetDetectors,
    qualityAdapters,
  };
}
