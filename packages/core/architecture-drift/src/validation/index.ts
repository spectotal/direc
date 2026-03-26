import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { validateRoleDefinitions } from "./validate-role-definitions.js";
import { validateRoleRules } from "./validate-role-rules.js";
import type {
  ModuleRoleDefinition,
  RoleBoundaryRule,
  ArchitectureDriftContext,
} from "../types/index.js";

export function validateRoleConfiguration(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
  rules: RoleBoundaryRule[],
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  return [
    ...validateRoleDefinitions(repositoryRoot, roleDefinitions, context),
    ...validateRoleRules(repositoryRoot, roleDefinitions, rules, context),
  ];
}
