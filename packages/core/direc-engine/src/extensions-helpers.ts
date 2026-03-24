import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AnalyzerPlugin } from "direc-analysis-runtime";
import type { FacetDetector } from "direc-facet-detect";
import type { DirecExtensionModule } from "./extension-types.js";
import type { QualityRoutineAdapter } from "./quality-routines.js";

export function normalizeExtensionModule(value: Record<string, unknown>): DirecExtensionModule {
  const candidate = isRecord(value.default) ? value.default : value;

  return {
    analyzers: Array.isArray(candidate.analyzers)
      ? candidate.analyzers.filter(isAnalyzerPlugin)
      : undefined,
    facetDetectors: Array.isArray(candidate.facetDetectors)
      ? candidate.facetDetectors.filter(
          (entry): entry is FacetDetector => typeof entry === "function",
        )
      : undefined,
    qualityAdapters: Array.isArray(candidate.qualityAdapters)
      ? candidate.qualityAdapters.filter(isQualityRoutineAdapter)
      : undefined,
  };
}

export function resolveExtensionSpecifier(repositoryRoot: string, source: string): string {
  if (source.startsWith("file:")) {
    return source;
  }

  if (isAbsolute(source) || source.startsWith(".")) {
    return pathToFileURL(resolve(repositoryRoot, source)).href;
  }

  return source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnalyzerPlugin(value: unknown): value is AnalyzerPlugin {
  return isRecord(value) && typeof value.id === "string" && typeof value.run === "function";
}

function isQualityRoutineAdapter(value: unknown): value is QualityRoutineAdapter {
  return isRecord(value) && typeof value.id === "string" && Array.isArray(value.supportedFacets);
}
