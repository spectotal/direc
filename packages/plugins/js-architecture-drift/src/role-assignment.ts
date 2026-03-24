import { matchesModulePattern } from "./module-match.js";
import type { MadgeGraph, ModuleRoleDefinition } from "./types.js";

export type ModuleRoleAssignments = Record<string, string[]>;

export function collectModuleRoleAssignments(
  graph: MadgeGraph,
  roleDefinitions: ModuleRoleDefinition[],
): ModuleRoleAssignments {
  return Object.fromEntries(
    Object.keys(graph).map((modulePath) => [
      modulePath,
      resolveModuleRoles(modulePath, roleDefinitions),
    ]),
  );
}

function resolveModuleRoles(modulePath: string, roleDefinitions: ModuleRoleDefinition[]): string[] {
  return roleDefinitions
    .filter((definition) =>
      definition.match.some((pattern) => matchesModulePattern(modulePath, pattern)),
    )
    .map((definition) => definition.role);
}
