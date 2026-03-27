export interface ClusterArtifactPayload {
  clusterByPath: Record<string, string>;
  clusters: Record<string, string[]>;
}

export interface RoleDefinition {
  role: string;
  paths: string[];
}

export interface RolesArtifactPayload {
  roles: RoleDefinition[];
}

export interface BoundaryDefinition {
  role: string;
  allowedRoles: string[];
}

export interface BoundariesArtifactPayload {
  clusterByPath: Record<string, string>;
  boundaries: BoundaryDefinition[];
}
