export const ROLE_BOUNDARY_CONFIG_KEYS = {
  SOURCE_ROLE: "sourceRole",
  ALL_SOURCE_ROLES: "allSourceRoles",
  ONLY_DEPEND_ON_ROLES: "onlyDependOnRoles",
  NOT_DEPEND_ON_ROLES: "notDependOnRoles",
} as const;

export type RoleBoundaryConfigKey =
  (typeof ROLE_BOUNDARY_CONFIG_KEYS)[keyof typeof ROLE_BOUNDARY_CONFIG_KEYS];

export const VIOLATION_CATEGORIES = {
  FORBIDDEN_DEPENDENCY: "forbidden-role-dependency",
  UNASSIGNED_MODULE: "unassigned-module",
  CIRCULAR_DEPENDENCY: "circular-dependency",
  INVALID_ROLE_CONFIG: "invalid-role-config",
} as const;

export type ViolationCategory = (typeof VIOLATION_CATEGORIES)[keyof typeof VIOLATION_CATEGORIES];

export const FINDING_SCOPES = {
  DEPENDENCY_EDGE: "dependency-edge",
  FILE: "file",
  FILESYSTEM: "filesystem",
  REPOSITORY: "repository",
} as const;

export type FindingScopeKind = (typeof FINDING_SCOPES)[keyof typeof FINDING_SCOPES];
