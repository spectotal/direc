import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import type {
  ModuleRoleDefinition,
  RoleBoundaryRule,
  ArchitectureDriftContext,
} from "../types/index.js";
import { isNonEmptyString } from "./rules/utils.js";
import { validateSourceRoles } from "./rules/source-roles.js";
import { validateDependOnRoles } from "./rules/depend-roles.js";
import { validateRoleExistence } from "./rules/existence.js";

export function validateRoleRules(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
  rules: RoleBoundaryRule[],
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const roleNames = roleDefinitions.map((definition) => definition.role).filter(isNonEmptyString);
  const definedRoleSet = new Set(roleNames);

  rules.forEach((rule, index) => {
    findings.push(...validateSourceRoles(repositoryRoot, rule, index, context));
    findings.push(...validateDependOnRoles(repositoryRoot, rule, index, context));
    findings.push(...validateRoleExistence(repositoryRoot, rule, index, definedRoleSet, context));
  });

  return findings;
}
