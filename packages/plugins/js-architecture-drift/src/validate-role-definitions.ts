import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { createConfigFinding } from "./config-findings.js";
import type { ModuleRoleDefinition } from "./types.js";

export function validateRoleDefinitions(
  repositoryRoot: string,
  roleDefinitions: ModuleRoleDefinition[],
): AnalyzerFinding[] {
  const findings: AnalyzerFinding[] = [];
  const roleNames = roleDefinitions.map((definition) => definition.role).filter(isNonEmptyString);
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

  return findings;
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
