import type { ArtifactEnvelope, ArtifactSelector } from "../index.js";

export function selectArtifactsByType<TPayload = unknown>(
  artifacts: ArtifactEnvelope[],
  types: string[],
): ArtifactEnvelope<TPayload>[] {
  const wanted = new Set(types);
  return artifacts.filter((artifact) => wanted.has(artifact.type)) as ArtifactEnvelope<TPayload>[];
}

export function satisfiesSelector(
  artifacts: ArtifactEnvelope[],
  selector: ArtifactSelector,
): boolean {
  const artifactTypes = new Set(artifacts.map((artifact) => artifact.type));
  return (
    selectorAllOfSatisfied(selector, artifactTypes) &&
    selectorAnyOfSatisfied(selector, artifactTypes)
  );
}

function selectorAllOfSatisfied(selector: ArtifactSelector, artifactTypes: Set<string>): boolean {
  return !(selector.allOf ?? []).some((type) => !artifactTypes.has(type));
}

function selectorAnyOfSatisfied(selector: ArtifactSelector, artifactTypes: Set<string>): boolean {
  const anyOf = selector.anyOf ?? [];
  return anyOf.length === 0 || anyOf.some((type) => artifactTypes.has(type));
}
