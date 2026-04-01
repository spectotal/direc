import type {
  ComplexityFileMetric,
  ComplexitySkippedFile,
} from "@spectotal/direc-tool-js-complexity";

export interface ComplexityFindingsArtifactPayload {
  warningThreshold: number;
  errorThreshold: number;
  warningFiles: ComplexityFileMetric[];
  errorFiles: ComplexityFileMetric[];
  skippedFiles: ComplexitySkippedFile[];
  warningCount: number;
  errorCount: number;
}
