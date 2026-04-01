import type { ArtifactSelector } from "@spectotal/direc-artifact-contracts";

export function collectSelectorTypes(selector: ArtifactSelector): string[] {
  return [...new Set([...(selector.allOf ?? []), ...(selector.anyOf ?? [])])];
}

export function isSourceArtifactType(type: string): boolean {
  return type.startsWith("source.");
}
