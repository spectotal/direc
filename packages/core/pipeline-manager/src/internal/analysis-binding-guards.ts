import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import { isSourceArtifactType } from "./selector-utils.js";

export function validateFacetNode(
  requiredTypes: string[],
  optionalTypes: string[],
  node: AnalysisNode,
  toolId: string,
): void {
  assertNodeRule(
    Boolean(node.requiredFacets?.length),
    `Facet tool ${toolId} must declare requiredFacets.`,
  );
  assertNodeRule(
    requiredTypes.some(isSourceArtifactType),
    `Facet tool ${toolId} must require at least one source artifact.`,
  );
  assertNodeRule(
    requiredTypes.every(isSourceArtifactType),
    `Facet tool ${toolId} may require only source artifacts.`,
  );
  assertNodeRule(
    optionalTypes.every(isSourceArtifactType),
    `Facet tool ${toolId} may declare only source optional inputs.`,
  );
}

export function validateAgnosticNode(
  requiredTypes: string[],
  optionalTypes: string[],
  node: AnalysisNode,
  toolId: string,
): void {
  assertNodeRule(
    (node.requiredFacets?.length ?? 0) === 0,
    `Agnostic tool ${toolId} may not declare requiredFacets.`,
  );
  assertNodeRule(
    requiredTypes.every((type) => !isSourceArtifactType(type)),
    `Agnostic tool ${toolId} may not require source artifacts.`,
  );
  assertNodeRule(
    optionalTypes.every((type) => !isSourceArtifactType(type)),
    `Agnostic tool ${toolId} may not declare source optional inputs.`,
  );
}

function assertNodeRule(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
