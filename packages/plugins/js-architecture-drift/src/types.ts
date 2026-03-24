export type ModuleRoleDefinition = {
  role: string;
  match: string[];
  description?: string;
};

export type RoleBoundaryRule = {
  sourceRole?: string;
  allSourceRoles?: string[];
  onlyDependOnRoles?: string[];
  notDependOnRoles?: string[];
  message?: string;
};

export type MadgeGraph = Record<string, string[]>;

export type ArchitectureToolResult = {
  graph: MadgeGraph;
  circular: string[][];
};

export type ArchitectureRunner = (options: {
  repositoryRoot: string;
  targetPaths: string[];
  tsConfigPath?: string;
}) => Promise<ArchitectureToolResult>;

export interface ArchitectureDriftPluginOptions {
  moduleRoles?: ModuleRoleDefinition[];
  roleBoundaryRules?: RoleBoundaryRule[];
  excludePaths?: string[];
  tsConfigPath?: string;
}
