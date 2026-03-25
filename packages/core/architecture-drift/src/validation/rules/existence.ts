import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { createConfigFinding } from "../config-findings.js";
import {
  type RoleBoundaryRule,
  type ArchitectureDriftContext,
  ROLE_BOUNDARY_CONFIG_KEYS,
} from "../../types/index.js";
import { isNonEmptyString } from "./utils.js";

export function validateRoleExistence(
  repositoryRoot: string,
  rule: RoleBoundaryRule,
  index: number,
  rolesConfigured: Set<string>,
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const hasValidSourceRole = isNonEmptyString(rule.sourceRole);

  const unknownSourceRoles = [
    ...(hasValidSourceRole && typeof rule.sourceRole === "string" ? [rule.sourceRole] : []),
    ...((rule.allSourceRoles ?? []).filter(isNonEmptyString) as string[]),
  ].filter((role) => !rolesConfigured.has(role));

  if (unknownSourceRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:unknown-source:${unknownSourceRoles.join(",")}`,
        `Role boundary rule at index ${index} references unknown source roles: ${unknownSourceRoles.join(", ")}.`,
        {
          index,
          unknownRoles: unknownSourceRoles,
          side: hasValidSourceRole
            ? ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE
            : ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES,
          rule: rule,
          missingRoles: (rule.allSourceRoles ?? []).filter((r) => !rolesConfigured.has(r)),
        },
        context,
      ),
    );
  }

  const unknownOnlyDependOnRoles = (rule.onlyDependOnRoles ?? [])
    .filter(isNonEmptyString)
    .filter((role) => !rolesConfigured.has(role));
  if (unknownOnlyDependOnRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:unknown-only-depend-on:${unknownOnlyDependOnRoles.join(",")}`,
        `Role boundary rule at index ${index} references unknown ${ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES}: ${unknownOnlyDependOnRoles.join(", ")}.`,
        {
          index,
          unknownRoles: unknownOnlyDependOnRoles,
          side: ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES,
        },
        context,
      ),
    );
  }

  const unknownNotDependOnRoles = (rule.notDependOnRoles ?? [])
    .filter(isNonEmptyString)
    .filter((role) => !rolesConfigured.has(role));
  if (unknownNotDependOnRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:unknown-not-depend-on:${unknownNotDependOnRoles.join(",")}`,
        `Role boundary rule at index ${index} references unknown ${ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES}: ${unknownNotDependOnRoles.join(", ")}.`,
        {
          index,
          unknownRoles: unknownNotDependOnRoles,
          side: ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES,
        },
        context,
      ),
    );
  }

  return findings;
}
