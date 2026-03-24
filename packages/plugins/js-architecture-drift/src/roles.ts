import { resolve } from "node:path";
import type { AnalyzerFinding } from "direc-analysis-runtime";
import type { MadgeGraph, RoleBoundaryRule } from "./types.js";
import type { ModuleRoleAssignments } from "./role-assignment.js";
export type { ModuleRoleAssignments } from "./role-assignment.js";
export { collectModuleRoleAssignments } from "./role-assignment.js";

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
      const dependencyRoles = roleAssignments[dependency] ?? [];

      if (dependencyRoles.length === 0) {
        continue;
      }

      for (const rule of rules) {
        const matchedFromRoles = fromRoles.filter((role) => rule.fromRoles.includes(role));
        const matchedDisallowedRoles = dependencyRoles.filter((role) =>
          rule.disallowRoles.includes(role),
        );

        if (matchedFromRoles.length === 0 || matchedDisallowedRoles.length === 0) {
          continue;
        }

        findings.push({
          fingerprint:
            `${fromModule}->${dependency}:role-boundary:` +
            `${matchedFromRoles.join(",")}=>${matchedDisallowedRoles.join(",")}`,
          analyzerId: "js-architecture-drift",
          facetId: "js",
          severity: "error" as const,
          category: "forbidden-role-dependency",
          message:
            rule.message ??
            `${fromModule} depends on ${dependency}, which violates configured role boundaries.`,
          scope: {
            kind: "dependency-edge" as const,
            path: resolve(repositoryRoot, fromModule),
            dependency: {
              from: fromModule,
              to: dependency,
            },
          },
          details: {
            fromRoles: matchedFromRoles,
            dependencyRoles: matchedDisallowedRoles,
          },
        });
      }
    }
  }

  return findings;
}

export function collectUnassignedModuleFindings(
  repositoryRoot: string,
  graph: MadgeGraph,
  roleAssignments: ModuleRoleAssignments,
): AnalyzerFinding[] {
  const incomingAssignedDependencies = new Map<string, string[]>();

  for (const [fromModule, dependencies] of Object.entries(graph)) {
    if ((roleAssignments[fromModule] ?? []).length === 0) {
      continue;
    }

    for (const dependency of dependencies) {
      const dependents = incomingAssignedDependencies.get(dependency) ?? [];
      dependents.push(fromModule);
      incomingAssignedDependencies.set(dependency, dependents);
    }
  }

  return Object.entries(graph)
    .filter(([modulePath]) => (roleAssignments[modulePath] ?? []).length === 0)
    .flatMap(([modulePath, dependencies]) => {
      const assignedDependencies = dependencies.filter(
        (dependency) => (roleAssignments[dependency] ?? []).length > 0,
      );
      const assignedDependents = incomingAssignedDependencies.get(modulePath) ?? [];

      if (assignedDependencies.length === 0 && assignedDependents.length === 0) {
        return [];
      }

      return [
        {
          fingerprint: `${modulePath}:unassigned-module`,
          analyzerId: "js-architecture-drift",
          facetId: "js",
          severity: "error" as const,
          category: "unassigned-module",
          message:
            `${modulePath} participates in governed dependency edges ` +
            "but does not match any configured module role.",
          scope: {
            kind: "file" as const,
            path: resolve(repositoryRoot, modulePath),
          },
          details: {
            assignedDependencies,
            assignedDependents,
          },
        },
      ];
    });
}
