import { resolve } from "node:path";
import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";
import {
  type ArchitectureDriftContext,
  ROLE_BOUNDARY_CONFIG_KEYS,
  VIOLATION_CATEGORIES,
  FINDING_SCOPES,
} from "../types/index.js";

export type RoleBoundaryViolationKind =
  | typeof ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES
  | typeof ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES;

export function buildRoleBoundaryFinding(options: {
  repositoryRoot: string;
  fromModule: string;
  dependency: string;
  sourceRoles: string[];
  dependencyRoles: string[];
  allowedRoles?: string[];
  forbiddenRoles?: string[];
  matchedForbiddenRoles?: string[];
  violationKinds: RoleBoundaryViolationKind[];
  message?: string;
  context: ArchitectureDriftContext;
}): AnalyzerFinding {
  return {
    fingerprint:
      `${options.fromModule}->${options.dependency}:role-boundary:` +
      `${options.sourceRoles.join(",")}:` +
      `${options.violationKinds.join(",")}:` +
      `${(options.allowedRoles ?? []).join(",")}=>${(options.matchedForbiddenRoles ?? []).join(",")}`,
    analyzerId: options.context.analyzerId,
    facetId: options.context.facetId,
    severity: "error" as const,
    category: VIOLATION_CATEGORIES.FORBIDDEN_DEPENDENCY,
    message:
      options.message ??
      `${options.fromModule} depends on ${options.dependency}, which violates configured role dependency constraints.`,
    scope: {
      kind: FINDING_SCOPES.DEPENDENCY_EDGE,
      path: resolve(options.repositoryRoot, options.fromModule),
      dependency: {
        from: options.fromModule,
        to: options.dependency,
      },
    },
    details: {
      sourceRoles: options.sourceRoles,
      dependencyRoles: options.dependencyRoles,
      allowedRoles: options.allowedRoles ?? [],
      forbiddenRoles: options.forbiddenRoles ?? [],
      matchedForbiddenRoles: options.matchedForbiddenRoles ?? [],
      violationKinds: options.violationKinds,
    },
  };
}

export function buildUnassignedModuleFinding(options: {
  repositoryRoot: string;
  modulePath: string;
  assignedDependencies: string[];
  assignedDependents: string[];
  context: ArchitectureDriftContext;
}): AnalyzerFinding {
  return {
    fingerprint: `${options.modulePath}:unassigned-module`,
    analyzerId: options.context.analyzerId,
    facetId: options.context.facetId,
    severity: "error" as const,
    category: VIOLATION_CATEGORIES.UNASSIGNED_MODULE,
    message:
      `${options.modulePath} participates in governed dependency edges ` +
      "but does not match any configured module role.",
    scope: {
      kind: FINDING_SCOPES.FILE,
      path: resolve(options.repositoryRoot, options.modulePath),
    },
    details: {
      assignedDependencies: options.assignedDependencies,
      assignedDependents: options.assignedDependents,
    },
  };
}
