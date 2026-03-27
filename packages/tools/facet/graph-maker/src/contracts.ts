export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphArtifactPayload {
  nodes: string[];
  edges: GraphEdge[];
}
