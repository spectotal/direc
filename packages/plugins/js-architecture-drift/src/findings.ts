import { resolve } from "node:path";
import type {
  AnalyzerFinding,
  AnalyzerSnapshot,
  NormalizedWorkflowEvent,
} from "direc-analysis-runtime";
import { matchesAnyPathPattern } from "direc-analysis-runtime";
import type { ArchitectureToolResult, MadgeGraph } from "./types.js";

export function buildEmptySnapshot(options: {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  excludePaths: string[];
  findings?: AnalyzerFinding[];
}): AnalyzerSnapshot {
  const findings = options.findings ?? [];

  return {
    analyzerId: "js-architecture-drift",
    timestamp: new Date().toISOString(),
    repositoryRoot: options.repositoryRoot,
    event: options.event,
    findings,
    metrics: {
      moduleCount: 0,
      cycleCount: 0,
      boundaryViolationCount: 0,
      unassignedModuleCount: findings.filter((finding) => finding.category === "unassigned-module")
        .length,
      configIssueCount: findings.filter((finding) => finding.category === "invalid-role-config")
        .length,
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
): AnalyzerFinding[] {
  return circular.map((cyclePath) => ({
    fingerprint: `${cyclePath.join("->")}:cycle`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error" as const,
    category: "cycle",
    message: `Dependency cycle detected for ${cyclePath.join(" -> ")}.`,
    scope: {
      kind: "dependency-edge" as const,
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
