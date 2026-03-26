import { resolve } from "node:path";
import type {
  AnalyzerFinding,
  AnalyzerSnapshot,
  NormalizedWorkflowEvent,
} from "@spectotal/direc-analysis-runtime";
import { matchesAnyPathPattern } from "@spectotal/direc-analysis-runtime";
import {
  type ArchitectureToolResult,
  type MadgeGraph,
  type ArchitectureDriftContext,
  VIOLATION_CATEGORIES,
  FINDING_SCOPES,
} from "../types/index.js";

export function buildEmptySnapshot(options: {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  excludePaths: string[];
  findings?: AnalyzerFinding[];
  context: ArchitectureDriftContext;
}): AnalyzerSnapshot {
  const findings = options.findings ?? [];

  return {
    analyzerId: options.context.analyzerId,
    timestamp: new Date().toISOString(),
    repositoryRoot: options.repositoryRoot,
    event: options.event,
    findings,
    metrics: {
      moduleCount: 0,
      cycleCount: 0,
      boundaryViolationCount: 0,
      unassignedModuleCount: findings.filter(
        (finding) => finding.category === VIOLATION_CATEGORIES.UNASSIGNED_MODULE,
      ).length,
      configIssueCount: findings.filter(
        (finding) => finding.category === VIOLATION_CATEGORIES.INVALID_ROLE_CONFIG,
      ).length,
      excludedPathCount: 0,
    },
    metadata: {
      graph: {},
      circular: [],
      excludePaths: options.excludePaths,
      moduleRoles: {},
    },
  };
}

export function filterResult(
  result: ArchitectureToolResult,
  excludePaths: readonly string[],
): ArchitectureToolResult {
  return {
    graph: filterGraph(result.graph, excludePaths),
    circular: result.circular.filter(
      (cyclePath) => !cyclePath.some((path) => matchesAnyPathPattern(path, excludePaths)),
    ),
  };
}

export function createCycleFindings(
  repositoryRoot: string,
  circular: string[][],
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  return circular.map((cyclePath) => ({
    fingerprint: `${cyclePath.join("->")}:cycle`,
    analyzerId: context.analyzerId,
    facetId: context.facetId,
    severity: "error" as const,
    category: VIOLATION_CATEGORIES.CIRCULAR_DEPENDENCY,
    message: `Dependency cycle detected for ${cyclePath.join(" -> ")}.`,
    scope: {
      kind: FINDING_SCOPES.DEPENDENCY_EDGE,
      path: resolve(repositoryRoot, cyclePath[0] ?? "."),
      dependency: {
        from: cyclePath[0] ?? ".",
        to: cyclePath[1] ?? cyclePath[0] ?? ".",
      },
    },
  }));
}

function filterGraph(graph: MadgeGraph, excludePaths: readonly string[]): MadgeGraph {
  const filteredEntries = Object.entries(graph)
    .filter(([modulePath]) => !matchesAnyPathPattern(modulePath, excludePaths))
    .map(([modulePath, dependencies]) => [
      modulePath,
      dependencies.filter((dependency) => !matchesAnyPathPattern(dependency, excludePaths)),
    ]);

  return Object.fromEntries(filteredEntries);
}
