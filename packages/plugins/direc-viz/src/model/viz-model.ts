export interface RoleNode {
  id: string;
  label: string;
  description: string;
  violationCount: number;
  cycleCount: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  /** true = boundary violation */
  violation: boolean;
  message?: string;
}

export interface Violation {
  type: "boundary" | "cycle" | "unassigned" | "config";
  severity: "warning" | "error";
  message: string;
  scope?: string;
}

export interface FileMetric {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
}

export interface HistoryPoint {
  timestamp: string;
  changeId: string;
  metrics: {
    violations: number;
    cycles: number;
    avgComplexity: number;
  };
}

export interface VizModel {
  generatedAt: string;
  roles: RoleNode[];
  edges: DependencyEdge[];
  violations: Violation[];
  complexity: FileMetric[];
  history: HistoryPoint[];
  complexityThresholds: {
    warningThreshold: number;
    errorThreshold: number;
  };
}
