import type { AnalyzerFinding } from "direc-analysis-runtime";
import { createConfigFinding } from "./config-findings.js";
import type { ModuleRoleDefinition, RoleBoundaryRule } from "./types.js";

export function validateRoleRules(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
  rules: RoleBoundaryRule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const roleNames = roleDefinitions.map((definition) => definition.role).filter(isNonEmptyString);
  const definedRoleSet = new Set(roleNames);

  rules.forEach((rule, index) => {
    if (!Array.isArray(rule.fromRoles) || rule.fromRoles.length === 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:missing-from-roles`,
          `Role boundary rule at index ${index} must define at least one source role.`,
          {
            index,
          },
        ),
      );
    }

    if (!Array.isArray(rule.disallowRoles) || rule.disallowRoles.length === 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:missing-disallow-roles`,
          `Role boundary rule at index ${index} must define at least one disallowed role.`,
          {
            index,
          },
        ),
      );
    }

    const unknownFromRoles = (rule.fromRoles ?? []).filter((role) => !definedRoleSet.has(role));
    if (unknownFromRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:unknown-from:${unknownFromRoles.join(",")}`,
          `Role boundary rule at index ${index} references unknown source roles: ${unknownFromRoles.join(", ")}.`,
          {
            index,
            unknownRoles: unknownFromRoles,
            side: "fromRoles",
          },
        ),
      );
    }

    const unknownDisallowedRoles = (rule.disallowRoles ?? []).filter(
      (role) => !definedRoleSet.has(role),
    );
    if (unknownDisallowedRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:unknown-disallow:${unknownDisallowedRoles.join(",")}`,
          `Role boundary rule at index ${index} references unknown disallowed roles: ${unknownDisallowedRoles.join(", ")}.`,
          {
            index,
            unknownRoles: unknownDisallowedRoles,
            side: "disallowRoles",
          },
        ),
      );
    }
  });

  return findings;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
