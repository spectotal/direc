import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import { validateAgnosticNode, validateFacetNode } from "./analysis-binding-guards.js";
import { collectSelectorTypes } from "./selector-utils.js";

export function validateAnalysisNode(
  node: AnalysisNode,
  expectedBinding: "facet" | "agnostic",
  toolId: string,
): void {
  assertExpectedBinding(node, expectedBinding, toolId);

  const requiredTypes = collectSelectorTypes(node.requires);
  const optionalTypes = node.optionalInputs ?? [];

  const validator = node.binding === "facet" ? validateFacetNode : validateAgnosticNode;
  validator(requiredTypes, optionalTypes, node, toolId);
}

export function hasRequiredFacets(context: ProjectContext, node: AnalysisNode): boolean {
  const requiredFacets = node.requiredFacets ?? [];
  const availableFacets = new Set(context.facets.map((facet) => facet.id));

  return requiredFacets.every((facet) => availableFacets.has(facet));
}

function assertExpectedBinding(
  node: AnalysisNode,
  expectedBinding: "facet" | "agnostic",
  toolId: string,
): void {
  if (node.binding !== expectedBinding) {
    throw new Error(
      `Tool ${toolId} declares binding ${node.binding}, expected ${expectedBinding}.`,
    );
  }
}
