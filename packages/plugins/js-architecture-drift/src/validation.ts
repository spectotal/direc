import type { AnalyzerFinding } from "direc-analysis-runtime";
import { validateRoleDefinitions } from "./validate-role-definitions.js";
import { validateRoleRules } from "./validate-role-rules.js";
import type { ModuleRoleDefinition, RoleBoundaryRule } from "./types.js";

export function validateRoleConfiguration(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
  rules: RoleBoundaryRule[],
): AnalyzerFinding[] {
  return [
    ...validateRoleDefinitions(repositoryRoot, roleDefinitions),
    ...validateRoleRules(repositoryRoot, roleDefinitions, rules),
  ];
}
