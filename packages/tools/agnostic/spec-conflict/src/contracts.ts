export interface SpecConflictFinding {
  changeId: string;
  changeSpecPath: string;
  stableSpecPath: string;
  reason: string;
}

export interface SpecConflictArtifactPayload {
  comparedCount: number;
  conflictCount: number;
  warningCount: number;
  errorCount: number;
  conflicts: SpecConflictFinding[];
}
