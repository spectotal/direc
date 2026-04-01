import type { AnalysisNode, ToolConfig } from "@spectotal/direc-analysis-contracts";
import type { ArtifactEnvelope } from "@spectotal/direc-artifact-contracts";
import { collectSelectorTypes } from "./selector-utils.js";

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

export function extractOptions(config: ToolConfig): Record<string, unknown> {
  return config.options ?? {};
}
