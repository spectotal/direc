export interface ComplexityFileMetric {
  path: string;
  cyclomatic: number;
}

export interface ComplexityArtifactPayload {
  paths: string[];
  files: ComplexityFileMetric[];
  warningThreshold: number;
  errorThreshold: number;
  warningCount: number;
  errorCount: number;
  maxCyclomatic: number;
}
