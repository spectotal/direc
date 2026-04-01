import type { AnalysisBinding, AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type { ResolvedAnalysisStep, WorkspaceConfig } from "../index.js";
import { describeMissingInputs } from "./analysis-diagnostics.js";
import { hasRequiredFacets, validateAnalysisNode } from "./analysis-validation.js";
import { orderAgnosticTools } from "./analysis-ordering.js";
import {
  resolveAnalysisNode as resolveRegisteredNode,
  resolveEnabledToolConfig,
} from "./analysis-step-loader.js";

export function resolveFacetTools(options: {
  toolIds: string[];
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
  sourceArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const resolved = options.toolIds
    .map((toolId) => resolveAnalysisStep({ ...options, binding: "facet", toolId }))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const missingInputs = resolved
    .flatMap((step) => describeMissingInputs(step, options.sourceArtifactTypes, new Set()))
    .filter((message, index, all) => all.indexOf(message) === index);

  if (missingInputs.length > 0) {
    throw new Error(`Facet analysis has unsatisfied inputs: ${missingInputs.join("; ")}`);
  }

  return resolved;
}

export function resolveAgnosticTools(options: {
  toolIds: string[];
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
  availableArtifactTypes: Set<string>;
}): ResolvedAnalysisStep[] {
  const resolved = options.toolIds
    .map((toolId) => resolveAnalysisStep({ ...options, binding: "agnostic", toolId }))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return orderAgnosticTools({
    steps: resolved,
    availableArtifactTypes: options.availableArtifactTypes,
  });
}

function resolveAnalysisStep(options: {
  binding: AnalysisBinding;
  toolId: string;
  config: WorkspaceConfig;
  nodeMap: Map<string, AnalysisNode>;
  projectContext: ProjectContext;
}): ResolvedAnalysisStep | null {
  const config = resolveEnabledToolConfig(options.config, options.toolId);
  if (!config) {
    return null;
  }

  const node = resolveRegisteredNode(config, options.nodeMap);
  validateAnalysisNode(node, options.binding, options.toolId);

  if (shouldSkipAnalysisNode(node, options.projectContext)) {
    return null;
  }

  return {
    config,
    node,
  };
}

function shouldSkipAnalysisNode(node: AnalysisNode, projectContext: ProjectContext): boolean {
  if (node.binding === "facet" && !hasRequiredFacets(projectContext, node)) {
    return true;
  }

  return !node.detect(projectContext);
}
