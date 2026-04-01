import type { AnalysisNode, CommandToolConfig } from "@spectotal/direc-analysis-contracts";
import { readCommandArtifacts } from "./command-runner.js";

export function createCommandAnalysisNode(config: CommandToolConfig): AnalysisNode {
  return {
    id: `command:${config.id}`,
    displayName: `Command ${config.id}`,
    binding: config.binding,
    requires: config.requires,
    optionalInputs: config.optionalInputs,
    requiredFacets: config.requiredFacets,
    produces: config.produces,
    detect: () => true,
    async run(context) {
      return await readCommandArtifacts(config, context.repositoryRoot, {
        runId: context.runId,
        pipelineId: context.pipelineId,
        sourceId: context.sourceId,
        options: context.options,
        inputArtifacts: context.inputArtifacts,
      });
    },
  };
}
