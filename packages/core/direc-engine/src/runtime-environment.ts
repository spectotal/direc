import type {
  AnalyzerPlugin,
  DetectedFacet,
  DirecConfig,
  QualityRoutineConfig,
} from "direc-analysis-runtime";
import { detectRepositoryFacets, scanRepository, type RepositoryScan } from "direc-facet-detect";
import { getRegisteredAnalyzers } from "./analyzers.js";
import { loadDirecExtensions, type LoadedDirecExtensions } from "./extensions.js";
import {
  detectQualityRoutines,
  getBuiltinQualityAdapters,
  type QualityRoutineAdapter,
} from "./quality-routines.js";

export interface LoadedAnalysisEnvironment {
  extensionSources: string[];
  extensions: LoadedDirecExtensions;
  detectedFacets: DetectedFacet[];
  qualityAdapters: QualityRoutineAdapter[];
  qualityRoutines: Record<string, QualityRoutineConfig>;
  analyzers: AnalyzerPlugin[];
}

export async function loadConfiguredAnalysisEnvironment(options: {
  repositoryRoot: string;
  config: DirecConfig;
  cliExtensions?: string[];
}): Promise<LoadedAnalysisEnvironment> {
  const extensionSources = resolveExtensionSources(
    options.config.extensions,
    options.cliExtensions,
  );
  const extensions = await loadDirecExtensions({
    repositoryRoot: options.repositoryRoot,
    sources: extensionSources,
  });
  const qualityAdapters = mergeQualityAdapters([
    ...getBuiltinQualityAdapters(),
    ...extensions.qualityAdapters,
  ]);
  const detectedFacets = await detectRepositoryFacets(options.repositoryRoot, {
    detectors: extensions.facetDetectors,
  });
  const qualityRoutines = options.config.qualityRoutines ?? {};
  const analyzers = getRegisteredAnalyzers({
    repositoryRoot: options.repositoryRoot,
    qualityRoutines,
    qualityAdapters,
    extensionAnalyzers: extensions.analyzers,
  });

  return {
    extensionSources,
    extensions,
    detectedFacets,
    qualityAdapters,
    qualityRoutines,
    analyzers,
  };
}

export async function bootstrapAnalysisEnvironment(options: {
  repositoryRoot: string;
  cliExtensions?: string[];
}): Promise<
  LoadedAnalysisEnvironment & {
    scan: RepositoryScan;
  }
> {
  const extensionSources = resolveExtensionSources([], options.cliExtensions);
  const extensions = await loadDirecExtensions({
    repositoryRoot: options.repositoryRoot,
    sources: extensionSources,
  });
  const qualityAdapters = mergeQualityAdapters([
    ...getBuiltinQualityAdapters(),
    ...extensions.qualityAdapters,
  ]);
  const scan = await scanRepository(options.repositoryRoot);
  const detectedFacets = await detectRepositoryFacets(options.repositoryRoot, {
    detectors: extensions.facetDetectors,
  });
  const qualityRoutines = await detectQualityRoutines({
    repositoryRoot: options.repositoryRoot,
    scan,
    detectedFacets,
    adapters: qualityAdapters,
  });
  const analyzers = getRegisteredAnalyzers({
    repositoryRoot: options.repositoryRoot,
    qualityRoutines,
    qualityAdapters,
    extensionAnalyzers: extensions.analyzers,
  });

  return {
    scan,
    extensionSources,
    extensions,
    detectedFacets,
    qualityAdapters,
    qualityRoutines,
    analyzers,
  };
}

export function resolveExtensionSources(
  configExtensions?: string[],
  cliExtensions?: string[],
): string[] {
  return [...new Set([...(configExtensions ?? []), ...(cliExtensions ?? [])])];
}

function mergeQualityAdapters(adapters: QualityRoutineAdapter[]): QualityRoutineAdapter[] {
  const seen = new Set<string>();

  for (const adapter of adapters) {
    if (seen.has(adapter.id)) {
      throw new Error(`Duplicate quality adapter id detected: ${adapter.id}`);
    }

    seen.add(adapter.id);
  }

  return adapters;
}
