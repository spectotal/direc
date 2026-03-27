export interface ComplexityFileMetric {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
}

export interface ComplexitySkippedFile {
  path: string;
  message: string;
}

export interface ComplexityArtifactPayload {
  paths: string[];
  files: ComplexityFileMetric[];
  skippedFiles: ComplexitySkippedFile[];
  warningThreshold: number;
  errorThreshold: number;
  warningCount: number;
  errorCount: number;
  thresholdWarningCount: number;
  thresholdErrorCount: number;
  skippedFileCount: number;
  maxCyclomatic: number;
}
