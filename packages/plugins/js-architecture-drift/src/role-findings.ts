import { resolve } from "node:path";
import type { AnalyzerFinding } from "direc-analysis-runtime";

export type RoleBoundaryViolationKind = "onlyDependOnRoles" | "notDependOnRoles";

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
}): AnalyzerFinding {
  return {
    fingerprint:
      `${options.fromModule}->${options.dependency}:role-boundary:` +
      `${options.sourceRoles.join(",")}:` +
      `${options.violationKinds.join(",")}:` +
      `${(options.allowedRoles ?? []).join(",")}=>${(options.matchedForbiddenRoles ?? []).join(",")}`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error" as const,
    category: "forbidden-role-dependency",
    message:
      options.message ??
      `${options.fromModule} depends on ${options.dependency}, which violates configured role dependency constraints.`,
    scope: {
      kind: "dependency-edge" as const,
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
}): AnalyzerFinding {
  return {
    fingerprint: `${options.modulePath}:unassigned-module`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error" as const,
    category: "unassigned-module",
    message:
      `${options.modulePath} participates in governed dependency edges ` +
      "but does not match any configured module role.",
    scope: {
      kind: "file" as const,
      path: resolve(options.repositoryRoot, options.modulePath),
    },
    details: {
      assignedDependencies: options.assignedDependencies,
      assignedDependents: options.assignedDependents,
    },
  };
}
