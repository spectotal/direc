import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import type { ModuleRoleAssignments } from "../assignments/index.js";
import type { MadgeGraph, RoleBoundaryRule, ArchitectureDriftContext } from "../types/index.js";
import { evaluateRuleViolation, resolveMatchedSourceRoles } from "./role-boundaries-helpers.js";

export function collectRoleBoundaryViolations(
  repositoryRoot: string,
  graph: MadgeGraph,
  roleAssignments: ModuleRoleAssignments,
  rules: RoleBoundaryRule[],
  context: ArchitectureDriftContext,
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
          context,
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
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];

  if (dependencyRoles.length === 0) {
    return findings;
  }

  for (const rule of rules) {
    const matchedSourceRoles = resolveMatchedSourceRoles(fromRoles, rule);

    if (matchedSourceRoles.length === 0) {
      continue;
    }

    const finding = evaluateRuleViolation(
      repositoryRoot,
      fromModule,
      dependency,
      matchedSourceRoles,
      dependencyRoles,
      rule,
      context,
    );

    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}
