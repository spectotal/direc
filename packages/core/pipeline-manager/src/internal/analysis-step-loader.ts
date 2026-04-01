import type { AnalysisNode, ToolConfig } from "@spectotal/direc-analysis-contracts";
import type { WorkspaceConfig } from "../index.js";
import { createCommandAnalysisNode } from "./command-node.js";

export function resolveEnabledToolConfig(
  config: WorkspaceConfig,
  toolId: string,
): ToolConfig | null {
  const toolConfig = config.tools[toolId];
  if (!toolConfig) {
    throw new Error(`Pipeline references missing tool ${toolId}.`);
  }

  return toolConfig.enabled ? toolConfig : null;
}

export function resolveAnalysisNode(
  config: ToolConfig,
  nodeMap: Map<string, AnalysisNode>,
): AnalysisNode {
  const node =
    config.kind === "command" ? createCommandAnalysisNode(config) : nodeMap.get(config.plugin);

  if (!node) {
    throw new Error(`No analysis node registered for ${describeAnalysisNode(config)}.`);
  }

  return node;
}

function describeAnalysisNode(config: ToolConfig): string {
  return config.kind === "command" ? config.id : config.plugin;
}
