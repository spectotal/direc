import type { WorkspaceConfig } from "./types.js";

export function addJsTools(config: WorkspaceConfig): void {
  config.tools.jsComplexity = {
    id: "jsComplexity",
    kind: "builtin",
    plugin: "js-complexity",
    enabled: true,
    options: {
      warningThreshold: 10,
      errorThreshold: 20,
    },
  };
  config.tools.graph = {
    id: "graph",
    kind: "builtin",
    plugin: "graph-maker",
    enabled: true,
  };
  config.tools.cluster = {
    id: "cluster",
    kind: "builtin",
    plugin: "cluster-builder",
    enabled: true,
  };
  config.tools.bounds = {
    id: "bounds",
    kind: "builtin",
    plugin: "bounds-evaluator",
    enabled: true,
  };
  config.tools.complexityFindings = {
    id: "complexityFindings",
    kind: "builtin",
    plugin: "complexity-findings",
    enabled: true,
  };
}

export function addQualityPipeline(
  config: WorkspaceConfig,
  id: string,
  description: string,
  source: string,
): void {
  config.pipelines.push({
    id,
    description,
    source,
    analysis: {
      facet: enabledTools(config, ["jsComplexity", "graph"]),
      agnostic: enabledTools(config, ["cluster", "bounds", "complexityFindings"]),
    },
    feedback: {
      sinks: qualityPipelineSinks(config),
    },
  });
}

export function enabledTools(config: WorkspaceConfig, toolIds: string[]): string[] {
  return toolIds.filter((toolId) => Boolean(config.tools[toolId]));
}

function qualityPipelineSinks(config: WorkspaceConfig): string[] {
  return ["console", ...(config.sinks["agent-feedback"] ? ["agent-feedback"] : [])];
}
