import type { AnalyzerPlugin } from "@spectotal/direc-analysis-runtime";
import type { FacetDetector } from "@spectotal/direc-facet-detect";
import type { QualityRoutineAdapter } from "./quality-routines.js";

export interface DirecExtensionModule {
  analyzers?: AnalyzerPlugin[];
  facetDetectors?: FacetDetector[];
  qualityAdapters?: QualityRoutineAdapter[];
}

export interface LoadedDirecExtensions {
  sources: string[];
  analyzers: AnalyzerPlugin[];
  facetDetectors: FacetDetector[];
  qualityAdapters: QualityRoutineAdapter[];
}
