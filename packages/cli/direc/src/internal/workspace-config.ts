import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type { WorkspaceConfig } from "@spectotal/direc-pipeline-manager";
import { DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS } from "@spectotal/direc-source-repository";
import type { BuildWorkspaceConfigOptions } from "./types.js";

export function buildWorkspaceConfig(
  context: ProjectContext,
  options: BuildWorkspaceConfigOptions = {},
): WorkspaceConfig {
  const now = options.now ?? (() => new Date());
  const facets = context.facets.map((facet) => facet.id);
  const config: WorkspaceConfig = {
    version: 1,
    generatedAt: now().toISOString(),
    facets,
    skills: options.skills,
    sources: {},
    tools: {},
    sinks: {},
    pipelines: [],
  };

  config.sources.repository = {
    id: "repository",
    plugin: "repository",
    enabled: true,
    options: {
      excludePaths: [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS],
    },
  };

  if (context.hasGit) {
    config.sources.diff = {
      id: "diff",
      plugin: "git-diff",
      enabled: true,
    };
  }

  if (context.hasOpenSpec) {
    config.sources.openspecTasks = {
      id: "openspecTasks",
      plugin: "openspec",
      enabled: true,
      options: {
        mode: "tasks",
      },
    };
    config.sources.openspecSpecs = {
      id: "openspecSpecs",
      plugin: "openspec",
      enabled: true,
      options: {
        mode: "spec-change",
      },
    };
  }

  if (facets.includes("js")) {
    addJsTools(config);
  }

  if (context.hasOpenSpec) {
    config.tools.specDocuments = {
      id: "specDocuments",
      kind: "builtin",
      plugin: "spec-documents",
      enabled: true,
    };
    config.tools.specConflict = {
      id: "specConflict",
      kind: "builtin",
      plugin: "spec-conflict",
      enabled: true,
    };
  }

  config.sinks.console = {
    id: "console",
    plugin: "console",
    enabled: true,
  };

  if (config.sources.repository && config.tools.jsComplexity && config.tools.graph) {
    addQualityPipeline(
      config,
      "repository-quality",
      "Inspect repository-wide scope with facet and agnostic analysis.",
      "repository",
    );
  }
  if (config.sources.diff) {
    addQualityPipeline(
      config,
      "diff-quality",
      "Inspect current git diff with facet and agnostic analysis.",
      "diff",
    );
  }
  if (config.sources.openspecTasks) {
    addQualityPipeline(
      config,
      "openspec-task-feedback",
      "Evaluate completed OpenSpec tasks against facet and agnostic code analysis.",
      "openspecTasks",
    );
  }
  if (config.sources.openspecSpecs) {
    config.pipelines.push({
      id: "openspec-spec-conflicts",
      description: "Compare OpenSpec change specs through facet and agnostic analysis.",
      source: "openspecSpecs",
      analysis: {
        facet: enabledTools(config, ["specDocuments"]),
        agnostic: enabledTools(config, ["specConflict"]),
      },
      feedback: {
        rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
        sinks: ["console"],
      },
    });
  }

  return config;
}

function addJsTools(config: WorkspaceConfig): void {
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
}

function addQualityPipeline(
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
      agnostic: enabledTools(config, ["cluster", "bounds"]),
    },
    feedback: {
      rules: [{ id: "thresholds", plugin: "analysis-thresholds" }],
      sinks: ["console"],
    },
  });
}

function enabledTools(config: WorkspaceConfig, toolIds: string[]): string[] {
  return toolIds.filter((toolId) => Boolean(config.tools[toolId]));
}
