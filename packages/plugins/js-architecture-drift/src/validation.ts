import { resolve } from "node:path";
import type { AnalyzerFinding } from "direc-analysis-runtime";
import type { ModuleRoleDefinition, RoleBoundaryRule } from "./types.js";

export function validateRoleConfiguration(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
  rules: RoleBoundaryRule[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const roleNames = roleDefinitions.map((definition) => definition.role).filter(isNonEmptyString);
  const definedRoleSet = new Set(roleNames);
  const duplicateRoleNames = findDuplicates(roleNames);

  for (const duplicateRoleName of duplicateRoleNames) {
    findings.push(
      createConfigFinding(
        repositoryRoot,
        `duplicate-role:${duplicateRoleName}`,
        `Role "${duplicateRoleName}" is defined more than once.`,
        {
          role: duplicateRoleName,
        },
      ),
    );
  }

  roleDefinitions.forEach((definition, index) => {
    if (!isNonEmptyString(definition.role)) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `role-${index}:missing-name`,
          `Role definition at index ${index} is missing a non-empty role name.`,
          {
            index,
          },
        ),
      );
    }

    if (!Array.isArray(definition.match) || definition.match.length === 0) {
      findings.push(
        createConfigFinding(
          repositoryRoot,
          `role-${index}:missing-match`,
          `Role "${definition.role || `#${index}`}" must define at least one match pattern.`,
          {
            index,
            role: definition.role,
          },
        ),
      );
      return;
    }

    definition.match.forEach((pattern, patternIndex) => {
      if (!isNonEmptyString(pattern)) {
        findings.push(
          createConfigFinding(
            repositoryRoot,
            `role-${index}:pattern-${patternIndex}`,
            `Role "${definition.role || `#${index}`}" contains an empty match pattern.`,
            {
              index,
              role: definition.role,
              patternIndex,
            },
          ),
        );
      }
    });
  });

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

function createConfigFinding(
  repositoryRoot: string,
  fingerprintSuffix: string,
  message: string,
  details: Record<string, unknown>,
): AnalyzerFinding {
  return {
    fingerprint: `architecture-config:${fingerprintSuffix}`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error",
    category: "invalid-role-config",
    message,
    scope: {
      kind: "repository",
      path: resolve(repositoryRoot),
    },
    details,
  };
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
