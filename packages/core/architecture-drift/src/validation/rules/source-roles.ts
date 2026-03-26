import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { createConfigFinding } from "../config-findings.js";
import {
  type RoleBoundaryRule,
  type ArchitectureDriftContext,
  ROLE_BOUNDARY_CONFIG_KEYS,
} from "../../types/index.js";
import { isNonEmptyString } from "./utils.js";

export function validateSourceRoles(
  repositoryRoot: string,
  rule: RoleBoundaryRule,
  index: number,
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const hasSourceRoleKey = ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE in rule;
  const hasAllSourceRolesKey = ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES in rule;

  if (hasSourceRoleKey && !isNonEmptyString(rule.sourceRole)) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:invalid-source-role`,
        `Role boundary rule at index ${index} must define a non-empty ${ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE}.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE },
        context,
      ),
    );
  }

  if (
    hasAllSourceRolesKey &&
    (!Array.isArray(rule.allSourceRoles) || rule.allSourceRoles.length === 0)
  ) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:invalid-all-source-roles`,
        `Role boundary rule at index ${index} must define at least one ${ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES} entry.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES },
        context,
      ),
    );
  }

  const emptyAllSourceRoles = (rule.allSourceRoles ?? []).filter((role) => !isNonEmptyString(role));
  if (emptyAllSourceRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:empty-all-source-roles`,
        `Role boundary rule at index ${index} contains empty ${ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES} entries.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES },
        context,
      ),
    );
  }

  const hasValidSourceRole = isNonEmptyString(rule.sourceRole);
  const hasValidAllSourceRoles =
    Array.isArray(rule.allSourceRoles) &&
    rule.allSourceRoles.length > 0 &&
    emptyAllSourceRoles.length === 0;

  if (hasValidSourceRole === hasValidAllSourceRoles) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:invalid-source-selector`,
        `Role boundary rule at index ${index} must define exactly one of "${ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE}" or "${ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES}".`,
        { index },
        context,
      ),
    );
  }

  return findings;
}
