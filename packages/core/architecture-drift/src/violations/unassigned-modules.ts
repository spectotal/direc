import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { buildUnassignedModuleFinding } from "./role-findings.js";
import type { ModuleRoleAssignments } from "../assignments/index.js";
import type { MadgeGraph, ArchitectureDriftContext } from "../types/index.js";

export function collectUnassignedModuleFindings(
  repositoryRoot: string,
  graph: MadgeGraph,
  roleAssignments: ModuleRoleAssignments,
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const incomingAssignedDependencies = collectIncomingAssignedDependencies(graph, roleAssignments);

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
        buildUnassignedModuleFinding({
          repositoryRoot,
          modulePath,
          assignedDependencies,
          assignedDependents,
          context,
        }),
      ];
    });
}

function collectIncomingAssignedDependencies(
  graph: MadgeGraph,
  roleAssignments: ModuleRoleAssignments,
): Map<string, string[]> {
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

  return incomingAssignedDependencies;
}
