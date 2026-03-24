import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
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
    const hasSourceRoleKey = "sourceRole" in rule;
    const hasAllSourceRolesKey = "allSourceRoles" in rule;
    const hasOnlyDependOnRolesKey = "onlyDependOnRoles" in rule;
    const hasNotDependOnRolesKey = "notDependOnRoles" in rule;

    if ("fromRoles" in rule) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:legacy-from-roles`,
          `Role boundary rule at index ${index} uses removed field "fromRoles"; use "sourceRole" or "allSourceRoles" instead.`,
          {
            index,
            side: "fromRoles",
          },
        ),
      );
    }

    if ("disallowRoles" in rule) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:legacy-disallow-roles`,
          `Role boundary rule at index ${index} uses removed field "disallowRoles"; use "onlyDependOnRoles" or "notDependOnRoles" instead.`,
          {
            index,
            side: "disallowRoles",
          },
        ),
      );
    }

    if (hasSourceRoleKey && !isNonEmptyString(rule.sourceRole)) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:invalid-source-role`,
          `Role boundary rule at index ${index} must define a non-empty sourceRole.`,
          {
            index,
            side: "sourceRole",
          },
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
          `Role boundary rule at index ${index} must define at least one allSourceRoles entry.`,
          {
            index,
            side: "allSourceRoles",
          },
        ),
      );
    }

    const emptyAllSourceRoles = (rule.allSourceRoles ?? []).filter(
      (role) => !isNonEmptyString(role),
    );
    if (emptyAllSourceRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:empty-all-source-roles`,
          `Role boundary rule at index ${index} contains empty allSourceRoles entries.`,
          {
            index,
            side: "allSourceRoles",
          },
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
          `Role boundary rule at index ${index} must define exactly one of "sourceRole" or "allSourceRoles".`,
          {
            index,
          },
        ),
      );
    }

    if (
      hasOnlyDependOnRolesKey &&
      (!Array.isArray(rule.onlyDependOnRoles) || rule.onlyDependOnRoles.length === 0)
    ) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:invalid-only-depend-on-roles`,
          `Role boundary rule at index ${index} must define at least one onlyDependOnRoles entry.`,
          {
            index,
            side: "onlyDependOnRoles",
          },
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
          `Role boundary rule at index ${index} must define at least one notDependOnRoles entry.`,
          {
            index,
            side: "notDependOnRoles",
          },
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
          `Role boundary rule at index ${index} contains empty onlyDependOnRoles entries.`,
          {
            index,
            side: "onlyDependOnRoles",
          },
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
          `Role boundary rule at index ${index} contains empty notDependOnRoles entries.`,
          {
            index,
            side: "notDependOnRoles",
          },
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
          `Role boundary rule at index ${index} must define at least one of "onlyDependOnRoles" or "notDependOnRoles".`,
          {
            index,
          },
        ),
      );
    }

    const unknownSourceRoles = [
      ...(isNonEmptyString(rule.sourceRole) ? [rule.sourceRole] : []),
      ...((rule.allSourceRoles ?? []).filter(isNonEmptyString) as string[]),
    ].filter((role) => !definedRoleSet.has(role));
    if (unknownSourceRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:unknown-source:${unknownSourceRoles.join(",")}`,
          `Role boundary rule at index ${index} references unknown source roles: ${unknownSourceRoles.join(", ")}.`,
          {
            index,
            unknownRoles: unknownSourceRoles,
            side: hasValidSourceRole ? "sourceRole" : "allSourceRoles",
          },
        ),
      );
    }

    const unknownOnlyDependOnRoles = (rule.onlyDependOnRoles ?? [])
      .filter(isNonEmptyString)
      .filter((role) => !definedRoleSet.has(role));
    if (unknownOnlyDependOnRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:unknown-only-depend-on:${unknownOnlyDependOnRoles.join(",")}`,
          `Role boundary rule at index ${index} references unknown onlyDependOnRoles: ${unknownOnlyDependOnRoles.join(", ")}.`,
          {
            index,
            unknownRoles: unknownOnlyDependOnRoles,
            side: "onlyDependOnRoles",
          },
        ),
      );
    }

    const unknownNotDependOnRoles = (rule.notDependOnRoles ?? [])
      .filter(isNonEmptyString)
      .filter((role) => !definedRoleSet.has(role));
    if (unknownNotDependOnRoles.length > 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `rule-${index}:unknown-not-depend-on:${unknownNotDependOnRoles.join(",")}`,
          `Role boundary rule at index ${index} references unknown notDependOnRoles: ${unknownNotDependOnRoles.join(", ")}.`,
          {
            index,
            unknownRoles: unknownNotDependOnRoles,
            side: "notDependOnRoles",
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
