import type { ResolvedAnalysisStep } from "../index.js";

export function describeMissingInputs(
  step: ResolvedAnalysisStep,
  availableArtifactTypes: Set<string>,
  pendingProducedTypes: Set<string>,
): string[] {
  const missing = readMissingAllOf(step, availableArtifactTypes, pendingProducedTypes);
  const anyOf = step.node.requires.anyOf ?? [];

  if (
    anyOf.length > 0 &&
    !anyOf.some((type) => availableArtifactTypes.has(type) || pendingProducedTypes.has(type))
  ) {
    missing.push(`${step.config.id} requires one of ${anyOf.join(", ")}`);
  }

  return missing;
}

export function selectorSatisfiedByTypes(
  selector: { allOf?: string[]; anyOf?: string[] },
  availableArtifactTypes: Set<string>,
): boolean {
  const allOf = selector.allOf ?? [];
  const anyOf = selector.anyOf ?? [];

  if (allOf.some((type) => !availableArtifactTypes.has(type))) {
    return false;
  }

  return anyOf.length === 0 || anyOf.some((type) => availableArtifactTypes.has(type));
}

function readMissingAllOf(
  step: ResolvedAnalysisStep,
  availableArtifactTypes: Set<string>,
  pendingProducedTypes: Set<string>,
): string[] {
  const missing: string[] = [];

  for (const type of step.node.requires.allOf ?? []) {
    if (!availableArtifactTypes.has(type) && !pendingProducedTypes.has(type)) {
      missing.push(`${step.config.id} requires ${type}`);
    }
  }

  return missing;
}
