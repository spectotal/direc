export type BoundaryRule = {
  from: string;
  disallow: string[];
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
  boundaryRules?: BoundaryRule[];
  excludePaths?: string[];
  tsConfigPath?: string;
}
