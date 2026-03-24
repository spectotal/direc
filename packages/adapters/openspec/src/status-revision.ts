import type { OpenSpecChangeStatus } from "./types.js";

export function getStatusRevision(status: OpenSpecChangeStatus): string {
  return status.artifacts
    .map((artifact) => `${artifact.id}:${artifact.status}`)
    .sort()
    .join("|");
}
