import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { createConfigFinding } from "../config-findings.js";
import {
  type RoleBoundaryRule,
  type ArchitectureDriftContext,
  ROLE_BOUNDARY_CONFIG_KEYS,
} from "../../types/index.js";
import { isNonEmptyString } from "./utils.js";

export function validateDependOnRoles(
  repositoryRoot: string,
  rule: RoleBoundaryRule,
  index: number,
  context: ArchitectureDriftContext,
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const hasOnlyDependOnRolesKey = ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES in rule;
  const hasNotDependOnRolesKey = ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES in rule;

  if (
    hasOnlyDependOnRolesKey &&
    (!Array.isArray(rule.onlyDependOnRoles) || rule.onlyDependOnRoles.length === 0)
  ) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:invalid-only-depend-on-roles`,
        `Role boundary rule at index ${index} must define at least one ${ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES} entry.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES },
        context,
      ),
    );
  }

  if (
    hasNotDependOnRolesKey &&
    (!Array.isArray(rule.notDependOnRoles) || rule.notDependOnRoles.length === 0)
  ) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:invalid-not-depend-on-roles`,
        `Role boundary rule at index ${index} must define at least one ${ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES} entry.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES },
        context,
      ),
    );
  }

  const emptyOnlyDependOnRoles = (rule.onlyDependOnRoles ?? []).filter(
    (role) => !isNonEmptyString(role),
  );
  if (emptyOnlyDependOnRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:empty-only-depend-on-roles`,
        `Role boundary rule at index ${index} contains empty ${ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES} entries.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES },
        context,
      ),
    );
  }

  const emptyNotDependOnRoles = (rule.notDependOnRoles ?? []).filter(
    (role) => !isNonEmptyString(role),
  );
  if (emptyNotDependOnRoles.length > 0) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:empty-not-depend-on-roles`,
        `Role boundary rule at index ${index} contains empty ${ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES} entries.`,
        { index, side: ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES },
        context,
      ),
    );
  }

  const hasValidOnlyDependOnRoles =
    Array.isArray(rule.onlyDependOnRoles) &&
    rule.onlyDependOnRoles.length > 0 &&
    emptyOnlyDependOnRoles.length === 0;
  const hasValidNotDependOnRoles =
    Array.isArray(rule.notDependOnRoles) &&
    rule.notDependOnRoles.length > 0 &&
    emptyNotDependOnRoles.length === 0;

  if (!hasValidOnlyDependOnRoles && !hasValidNotDependOnRoles) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `rule-${index}:missing-dependency-selectors`,
        `Role boundary rule at index ${index} must define at least one of "${ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES}" or "${ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES}".`,
        { rule },
        context,
      ),
    );
  }

  return findings;
}
