import type { AnalysisBinding } from "@spectotal/direc-analysis-contracts";
import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type {
  PipelinePlan,
  PipelineRegistry,
  ResolvedAnalysisStep,
  WorkspaceConfig,
} from "../index.js";
import { resolveAgnosticTools, resolveFacetTools } from "./analysis-resolution.js";
import { mapById } from "./persistence.js";

export function planPipelineExecution(options: {
  config: WorkspaceConfig;
  registry: PipelineRegistry;
  projectContext: ProjectContext;
  pipelineId: string;
}): PipelinePlan {
  const sourceMap = mapById(options.registry.sources);
  const nodeMap = mapById(options.registry.analysisNodes);
  const sinkMap = mapById(options.registry.sinks);
  const pipeline = options.config.pipelines.find((entry) => entry.id === options.pipelineId);

  if (!pipeline) {
    throw new Error(`Unknown pipeline: ${options.pipelineId}`);
  }

  const sourceConfig = options.config.sources[pipeline.source];
  if (!sourceConfig || !sourceConfig.enabled) {
    throw new Error(
      `Pipeline ${pipeline.id} references disabled or missing source ${pipeline.source}.`,
    );
  }

  const sourcePlugin = sourceMap.get(sourceConfig.plugin);
  if (!sourcePlugin) {
    throw new Error(`No source plugin registered for ${sourceConfig.plugin}.`);
  }
  if (!sourcePlugin.detect(options.projectContext)) {
    throw new Error(`Source plugin ${sourceConfig.plugin} is not applicable in this repository.`);
  }

  const sourceArtifactTypes = new Set(sourcePlugin.seedArtifactTypes);
  const availableArtifactTypes = new Set(sourceArtifactTypes);
  const analysis: Record<AnalysisBinding, ResolvedAnalysisStep[]> = {
    facet: resolveFacetTools({
      toolIds: pipeline.analysis.facet,
      config: options.config,
      nodeMap,
      projectContext: options.projectContext,
      sourceArtifactTypes,
    }),
    agnostic: [],
  };

  for (const step of analysis.facet) {
    for (const type of step.node.produces) {
      availableArtifactTypes.add(type);
    }
  }

  analysis.agnostic = resolveAgnosticTools({
    toolIds: pipeline.analysis.agnostic,
    config: options.config,
    nodeMap,
    projectContext: options.projectContext,
    availableArtifactTypes,
  });

  const sinks = pipeline.feedback.sinks
    .map((sinkId) => {
      const config = options.config.sinks[sinkId];
      if (!config || !config.enabled) {
        return null;
      }

      const sink = sinkMap.get(config.plugin);
      if (!sink) {
        throw new Error(`No feedback sink registered for ${config.plugin}.`);
      }
      if (!sink.detect(options.projectContext)) {
        return null;
      }

      return {
        config,
        sink,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return {
    pipeline,
    sourceConfig,
    sourcePlugin,
    analysis,
    sinks,
  };
}
