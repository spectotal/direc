import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import { buildRoleBoundaryFinding, type RoleBoundaryViolationKind } from "./role-findings.js";
import {
  type RoleBoundaryRule,
  type ArchitectureDriftContext,
  ROLE_BOUNDARY_CONFIG_KEYS,
} from "../types/index.js";

export function evaluateRuleViolation(
  repositoryRoot: string,
  fromModule: string,
  dependency: string,
  matchedSourceRoles: string[],
  dependencyRoles: string[],
  rule: RoleBoundaryRule,
  context: ArchitectureDriftContext,
): AnalyzerFinding | null {
  const allowedRoles = rule.onlyDependOnRoles ?? [];
  const forbiddenRoles = rule.notDependOnRoles ?? [];
  const matchedForbiddenRoles = dependencyRoles.filter((role) => forbiddenRoles.includes(role));
  const violationKinds: RoleBoundaryViolationKind[] = [];

  if (allowedRoles.length > 0 && !dependencyRoles.some((role) => allowedRoles.includes(role))) {
    violationKinds.push(ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES);
  }

  if (matchedForbiddenRoles.length > 0) {
    violationKinds.push(ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES);
  }

  if (violationKinds.length === 0) {
    return null;
  }

  return buildRoleBoundaryFinding({
    repositoryRoot,
    fromModule,
    dependency,
    sourceRoles: matchedSourceRoles,
    dependencyRoles,
    allowedRoles,
    forbiddenRoles,
    matchedForbiddenRoles,
    violationKinds,
    message: rule.message,
    context,
  });
}

export function resolveMatchedSourceRoles(fromRoles: string[], rule: RoleBoundaryRule): string[] {
  if (typeof rule.sourceRole === "string" && fromRoles.includes(rule.sourceRole)) {
    return [rule.sourceRole];
  }

  if (
    Array.isArray(rule.allSourceRoles) &&
    rule.allSourceRoles.length > 0 &&
    rule.allSourceRoles.every((role) => fromRoles.includes(role))
  ) {
    return [...rule.allSourceRoles];
  }

  return [];
}
