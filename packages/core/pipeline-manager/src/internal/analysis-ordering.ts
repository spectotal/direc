import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { ArtifactEnvelope } from "@spectotal/direc-artifact-contracts";
import type { ResolvedAnalysisStep } from "../index.js";
import { describeMissingInputs, selectorSatisfiedByTypes } from "./analysis-diagnostics.js";
import { collectSelectorTypes } from "./selector-utils.js";

export function orderAgnosticTools(options: {
  steps: ResolvedAnalysisStep[];
  availableArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const ordered: ResolvedAnalysisStep[] = [];
  const available = new Set(options.availableArtifactTypes);
  const unresolved = [...options.steps];

  while (unresolved.length > 0) {
    if (drainResolvableSteps(unresolved, ordered, available)) {
      continue;
    }

    throwUnresolvableAgnosticGraph(unresolved, available);
  }

  return ordered;
}

export function filterArtifactsForAnalysisStep(
  artifacts: ArtifactEnvelope[],
  node: AnalysisNode,
): ArtifactEnvelope[] {
  const selectedTypes = new Set([
    ...collectSelectorTypes(node.requires),
    ...(node.optionalInputs ?? []),
  ]);

  return artifacts.filter((artifact) => selectedTypes.has(artifact.type));
}

function drainResolvableSteps(
  unresolved: ResolvedAnalysisStep[],
  ordered: ResolvedAnalysisStep[],
  available: Set<string>,
): boolean {
  let progress = false;

  for (let index = 0; index < unresolved.length; ) {
    const step = unresolved[index];
    if (!step) {
      break;
    }

    if (selectorSatisfiedByTypes(step.node.requires, available)) {
      ordered.push(step);
      unresolved.splice(index, 1);
      for (const type of step.node.produces) {
        available.add(type);
      }
      progress = true;
      continue;
    }

    index += 1;
  }

  return progress;
}

function throwUnresolvableAgnosticGraph(
  unresolved: ResolvedAnalysisStep[],
  available: Set<string>,
): never {
  const pendingProducedTypes = new Set(unresolved.flatMap((step) => step.node.produces));
  const missingInputs = unresolved
    .flatMap((step) => describeMissingInputs(step, available, pendingProducedTypes))
    .filter((message, index, all) => all.indexOf(message) === index);

  if (missingInputs.length > 0) {
    throw new Error(`Agnostic analysis has unsatisfied inputs: ${missingInputs.join("; ")}`);
  }

  throw new Error(
    `Cycle detected between agnostic analysis nodes: ${unresolved
      .map((step) => step.config.id)
      .join(", ")}`,
  );
}
