import { resolve } from "node:path";
import type {
  AnalyzerFinding,
  AnalyzerSnapshot,
  NormalizedWorkflowEvent,
} from "direc-analysis-runtime";
import { matchesAnyPathPattern } from "direc-analysis-runtime";
import type { ArchitectureToolResult, BoundaryRule, MadgeGraph } from "./types.js";

export function buildEmptySnapshot(options: {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  excludePaths: string[];
}): AnalyzerSnapshot {
  return {
    analyzerId: "js-architecture-drift",
    timestamp: new Date().toISOString(),
    repositoryRoot: options.repositoryRoot,
    event: options.event,
    findings: [],
    metrics: {
      moduleCount: 0,
      cycleCount: 0,
      boundaryViolationCount: 0,
      excludedPathCount: 0,
    },
    metadata: {
      graph: {},
      circular: [],
      excludePaths: options.excludePaths,
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

export function collectBoundaryViolations(
  repositoryRoot: string,
  graph: MadgeGraph,
  rules: BoundaryRule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  for (const [fromModule, dependencies] of Object.entries(graph)) {
    for (const rule of rules) {
      if (!matchesRule(fromModule, rule.from)) {
        continue;
      }

      for (const dependency of dependencies) {
        if (!rule.disallow.some((pattern) => matchesRule(dependency, pattern))) {
          continue;
        }

        findings.push({
          fingerprint: `${fromModule}->${dependency}:boundary`,
          analyzerId: "js-architecture-drift",
          facetId: "js",
          severity: "error" as const,
          category: "forbidden-dependency",
          message:
            rule.message ??
            `${fromModule} depends on ${dependency}, which violates configured boundaries.`,
          scope: {
            kind: "dependency-edge" as const,
            path: resolve(repositoryRoot, fromModule),
            dependency: {
              from: fromModule,
              to: dependency,
            },
          },
        });
      }
    }
  }

  return findings;
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

function matchesRule(modulePath: string, pattern: string): boolean {
  if (pattern === ".") {
    return true;
  }

  const normalizedModulePath = modulePath.replaceAll("\\", "/");
  const normalizedPattern = pattern.replaceAll("\\", "/").replace(/\/$/, "");

  return (
    normalizedModulePath === normalizedPattern ||
    normalizedModulePath.startsWith(`${normalizedPattern}/`)
  );
}
