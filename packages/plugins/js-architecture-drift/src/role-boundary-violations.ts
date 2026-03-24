import type { AnalyzerFinding } from "direc-analysis-runtime";
import { buildRoleBoundaryFinding } from "./role-findings.js";
import type { ModuleRoleAssignments } from "./role-assignment.js";
import type { MadgeGraph, RoleBoundaryRule } from "./types.js";

export function collectRoleBoundaryViolations(
  repositoryRoot: string,
  graph: MadgeGraph,
  roleAssignments: ModuleRoleAssignments,
  rules: RoleBoundaryRule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  for (const [fromModule, dependencies] of Object.entries(graph)) {
    const fromRoles = roleAssignments[fromModule] ?? [];

    if (fromRoles.length === 0) {
      continue;
    }

    for (const dependency of dependencies) {
      findings.push(
        ...collectDependencyViolations(
          repositoryRoot,
          fromModule,
          dependency,
          fromRoles,
          roleAssignments[dependency] ?? [],
          rules,
        ),
      );
    }
  }

  return findings;
}

function collectDependencyViolations(
  repositoryRoot: string,
  fromModule: string,
  dependency: string,
  fromRoles: string[],
  dependencyRoles: string[],
  rules: RoleBoundaryRule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  if (dependencyRoles.length === 0) {
    return findings;
  }

  for (const rule of rules) {
    const matchedFromRoles = fromRoles.filter((role) => rule.fromRoles.includes(role));
    const matchedDisallowedRoles = dependencyRoles.filter((role) =>
      rule.disallowRoles.includes(role),
    );

    if (matchedFromRoles.length === 0 || matchedDisallowedRoles.length === 0) {
      continue;
    }

    findings.push(
      buildRoleBoundaryFinding({
        repositoryRoot,
        fromModule,
        dependency,
        matchedFromRoles,
        matchedDisallowedRoles,
        message: rule.message,
      }),
    );
  }

  return findings;
}
