import type { AnalyzerSnapshot } from "@spectotal/direc-analysis-runtime";
import type { VizConfig } from "../reader/config-reader.js";
import type { HistoryPoint as ReaderHistoryPoint } from "../reader/history-reader.js";
import type {
  VizModel,
  RoleNode,
  DependencyEdge,
  Violation,
  FileMetric,
  HistoryPoint,
} from "./viz-model.js";

interface ComplexityFileMeta {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
}

export function buildVizModel(
  config: VizConfig,
  driftSnapshot: AnalyzerSnapshot | null,
  complexitySnapshot: AnalyzerSnapshot | null,
  historyPoints: ReaderHistoryPoint[],
  repositoryRoot: string,
): VizModel {
  const driftMeta = driftSnapshot?.metadata as
    | {
        graph?: Record<string, string[]>;
        circular?: Array<{ paths?: string[][] }>;
        moduleRoles?: Record<string, string[]>;
      }
    | undefined;

  const graph: Record<string, string[]> = driftMeta?.graph ?? {};
  const moduleRoleAssignments: Record<string, string[]> = driftMeta?.moduleRoles ?? {};

  // Build role violation counts from findings
  const violationsByRole = new Map<string, number>();
  const cyclesByRole = new Map<string, number>();

  for (const finding of driftSnapshot?.findings ?? []) {
    const roleName =
      (finding.details?.sourceRole as string | undefined) ??
      (finding.details?.role as string | undefined);

    if (!roleName) continue;

    if (finding.category === "boundary-violation") {
      violationsByRole.set(roleName, (violationsByRole.get(roleName) ?? 0) + 1);
    }
    if (finding.category === "cycle") {
      cyclesByRole.set(roleName, (cyclesByRole.get(roleName) ?? 0) + 1);
    }
  }

  // Build role nodes from config
  const roles: RoleNode[] = config.moduleRoles.map((roleDef) => ({
    id: roleDef.role,
    label: roleDef.role,
    description: roleDef.description,
    violationCount: violationsByRole.get(roleDef.role) ?? 0,
    cycleCount: cyclesByRole.get(roleDef.role) ?? 0,
  }));

  // Add unassigned node if there are unassigned modules
  const unassignedCount = driftSnapshot?.metrics?.unassignedModuleCount ?? 0;
  if (unassignedCount > 0) {
    roles.push({
      id: "__unassigned__",
      label: `Unassigned (${unassignedCount})`,
      description: "Modules not assigned to any role",
      violationCount: 0,
      cycleCount: 0,
    });
  }

  // Build edges from role boundary rules + violations
  const roleSet = new Set(config.moduleRoles.map((r) => r.role));
  const edgeSet = new Set<string>();
  const edges: DependencyEdge[] = [];

  // Add allowed edges from boundary rules
  for (const rule of config.roleBoundaryRules) {
    for (const targetRole of rule.onlyDependOnRoles) {
      if (rule.sourceRole === targetRole) continue;
      if (!roleSet.has(rule.sourceRole) || !roleSet.has(targetRole)) continue;
      const key = `${rule.sourceRole}->${targetRole}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from: rule.sourceRole, to: targetRole, violation: false });
      }
    }
  }

  // Overlay violation edges from findings
  for (const finding of driftSnapshot?.findings ?? []) {
    if (finding.category !== "boundary-violation") continue;
    const sourceRole = finding.details?.sourceRole as string | undefined;
    const targetRole = finding.details?.targetRole as string | undefined;
    if (!sourceRole || !targetRole) continue;

    const key = `${sourceRole}->${targetRole}:violation`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        from: sourceRole,
        to: targetRole,
        violation: true,
        message: finding.message,
      });
    }
  }

  // Also derive edges from module-level graph mapped to roles
  if (Object.keys(graph).length > 0 && Object.keys(moduleRoleAssignments).length > 0) {
    for (const [modulePath, deps] of Object.entries(graph)) {
      const sourceRoles = moduleRoleAssignments[modulePath] ?? [];
      for (const dep of deps) {
        const targetRoles = moduleRoleAssignments[dep] ?? [];
        for (const sourceRole of sourceRoles) {
          for (const targetRole of targetRoles) {
            if (sourceRole === targetRole) continue;
            const key = `${sourceRole}->${targetRole}`;
            if (!edgeSet.has(key) && !edgeSet.has(`${key}:violation`)) {
              edgeSet.add(key);
              edges.push({ from: sourceRole, to: targetRole, violation: false });
            }
          }
        }
      }
    }
  }

  // Build violations list
  const violations: Violation[] = (driftSnapshot?.findings ?? []).map(
    (finding: import("@spectotal/direc-analysis-runtime").AnalyzerFinding) => ({
      type:
        finding.category === "boundary-violation"
          ? "boundary"
          : finding.category === "cycle"
            ? "cycle"
            : finding.category === "unassigned-module"
              ? "unassigned"
              : "config",
      severity: finding.severity === "error" ? "error" : "warning",
      message: finding.message,
      scope: finding.scope?.path ?? finding.scope?.packageName,
    }),
  );

  // Build complexity metrics
  const complexityMeta = complexitySnapshot?.metadata as
    | { files?: ComplexityFileMeta[] }
    | undefined;
  const complexity: FileMetric[] = (complexityMeta?.files ?? []).map((f) => ({
    path: f.path,
    cyclomatic: f.cyclomatic,
    logicalSloc: f.logicalSloc,
    maintainability: f.maintainability,
  }));

  const history: HistoryPoint[] = historyPoints.map((p) => ({
    timestamp: p.timestamp,
    changeId: p.changeId,
    metrics: p.metrics,
  }));

  return {
    generatedAt: new Date().toISOString(),
    repositoryRoot,
    roles,
    edges,
    violations,
    complexity,
    history,
    complexityThresholds: config.complexityThresholds,
  };
}
