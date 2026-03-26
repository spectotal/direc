export * from "./constants.js";
import { ROLE_BOUNDARY_CONFIG_KEYS } from "./constants.js";

export type ModuleRoleDefinition = {
  role: string;
  match: string[];
  description?: string;
};

export type ArchitectureDriftContext = {
  analyzerId: string;
  facetId: string;
};

export type RoleBoundaryRule = {
  [ROLE_BOUNDARY_CONFIG_KEYS.SOURCE_ROLE]?: string;
  [ROLE_BOUNDARY_CONFIG_KEYS.ALL_SOURCE_ROLES]?: string[];
  [ROLE_BOUNDARY_CONFIG_KEYS.ONLY_DEPEND_ON_ROLES]?: string[];
  [ROLE_BOUNDARY_CONFIG_KEYS.NOT_DEPEND_ON_ROLES]?: string[];
  message?: string;
};

export type MadgeGraph = Record<string, string[]>;

export type ArchitectureToolResult = {
  graph: MadgeGraph;
  circular: string[][];
};

export type ArchitectureRunner<TOptions = Record<string, unknown>> = (
  options: {
    repositoryRoot: string;
    targetPaths: string[];
  } & TOptions,
) => Promise<ArchitectureToolResult>;

export interface BaseArchitectureDriftPluginOptions {
  moduleRoles?: ModuleRoleDefinition[];
  roleBoundaryRules?: RoleBoundaryRule[];
  excludePaths?: string[];
}
