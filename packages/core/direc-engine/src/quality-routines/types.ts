import type {
  AnalyzerFinding,
  DetectedFacet,
  QualityRoutineConfig,
} from "@spectotal/direc-analysis-runtime";
import type { RepositoryScan } from "@spectotal/direc-facet-detect";

export type RootPackageManifest = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type QualityRoutineParseResult = {
  findings: AnalyzerFinding[];
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
  rawOutput?: unknown;
};

export type QualityRoutineExecutionResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  targetPaths: string[];
  scopedToEventPaths: boolean;
};

export interface QualityRoutineDetectionContext {
  repositoryRoot: string;
  scan: RepositoryScan;
  detectedFacets: DetectedFacet[];
  rootManifest: RootPackageManifest | null;
}

export interface QualityRoutineAdapter {
  id: string;
  displayName: string;
  supportedFacets: string[];
  supportsScopedPaths?: boolean;
  defaultTargetPath?: string;
  detect?(
    context: QualityRoutineDetectionContext,
  ): Promise<QualityRoutineConfig | null> | QualityRoutineConfig | null;
  parseRunResult?(options: {
    repositoryRoot: string;
    routineName: string;
    config: QualityRoutineConfig;
    execution: QualityRoutineExecutionResult;
  }): Promise<QualityRoutineParseResult> | QualityRoutineParseResult;
  parseReport?(options: {
    repositoryRoot: string;
    routineName: string;
    config: QualityRoutineConfig;
    reportPath: string;
    contents: string;
  }): Promise<QualityRoutineParseResult> | QualityRoutineParseResult;
}
