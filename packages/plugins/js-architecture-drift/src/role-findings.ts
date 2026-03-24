import { resolve } from "node:path";
import type { AnalyzerFinding } from "direc-analysis-runtime";

export function buildRoleBoundaryFinding(options: {
  repositoryRoot: string;
  fromModule: string;
  dependency: string;
  matchedFromRoles: string[];
  matchedDisallowedRoles: string[];
  message?: string;
}): AnalyzerFinding {
  return {
    fingerprint:
      `${options.fromModule}->${options.dependency}:role-boundary:` +
      `${options.matchedFromRoles.join(",")}=>${options.matchedDisallowedRoles.join(",")}`,
    analyzerId: "js-architecture-drift",
    facetId: "js",
    severity: "error" as const,
    category: "forbidden-role-dependency",
    message:
      options.message ??
      `${options.fromModule} depends on ${options.dependency}, which violates configured role boundaries.`,
    scope: {
      kind: "dependency-edge" as const,
      path: resolve(options.repositoryRoot, options.fromModule),
      dependency: {
        from: options.fromModule,
        to: options.dependency,
      },
    },
    details: {
      fromRoles: options.matchedFromRoles,
      dependencyRoles: options.matchedDisallowedRoles,
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
