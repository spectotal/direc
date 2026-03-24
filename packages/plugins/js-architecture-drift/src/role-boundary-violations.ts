import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { buildRoleBoundaryFinding, type RoleBoundaryViolationKind } from "./role-findings.js";
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
    const matchedSourceRoles = resolveMatchedSourceRoles(fromRoles, rule);

    if (matchedSourceRoles.length === 0) {
      continue;
    }

    const allowedRoles = rule.onlyDependOnRoles ?? [];
    const forbiddenRoles = rule.notDependOnRoles ?? [];
    const matchedForbiddenRoles = dependencyRoles.filter((role) => forbiddenRoles.includes(role));
    const violationKinds: RoleBoundaryViolationKind[] = [];

    if (allowedRoles.length > 0 && !dependencyRoles.some((role) => allowedRoles.includes(role))) {
      violationKinds.push("onlyDependOnRoles");
    }

    if (matchedForbiddenRoles.length > 0) {
      violationKinds.push("notDependOnRoles");
    }

    if (violationKinds.length === 0) {
      continue;
    }

    findings.push(
      buildRoleBoundaryFinding({
        repositoryRoot,
        fromModule,
        dependency,
        sourceRoles: matchedSourceRoles,
        dependencyRoles,
        allowedRoles,
        forbiddenRoles,
        matchedForbiddenRoles,
        violationKinds,
        message: rule.message,
      }),
    );
  }

  return findings;
}

function resolveMatchedSourceRoles(fromRoles: string[], rule: RoleBoundaryRule): string[] {
  if (typeof rule.sourceRole === "string" && fromRoles.includes(rule.sourceRole)) {
    return [rule.sourceRole];
  }

  if (
    Array.isArray(rule.allSourceRoles) &&
    rule.allSourceRoles.length > 0 &&
    rule.allSourceRoles.every((role) => fromRoles.includes(role))
  ) {
    return [...rule.allSourceRoles];
  }

  return [];
}
