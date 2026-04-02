import type {
  ComplexityFileMetric,
  ComplexitySkippedFile,
} from "@spectotal/direc-tool-js-complexity";

export type ComplexityGateStatus = "pass" | "warn" | "block";

export interface ComplexityFindingsArtifactPayload {
  status: ComplexityGateStatus;
  warningThreshold: number;
  errorThreshold: number;
  warningFiles: ComplexityFileMetric[];
  errorFiles: ComplexityFileMetric[];
  skippedFiles: ComplexitySkippedFile[];
  warningCount: number;
  errorCount: number;
}
