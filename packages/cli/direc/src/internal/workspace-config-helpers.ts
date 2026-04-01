import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import { DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS } from "@spectotal/direc-source-repository";
import type { WorkspaceConfig } from "./types.js";
import { addJsTools, addQualityPipeline, enabledTools } from "./workspace-config-pipelines.js";

export function registerSources(config: WorkspaceConfig, context: ProjectContext): void {
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

  if (!context.hasOpenSpec) {
    return;
  }

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

export function registerTools(
  config: WorkspaceConfig,
  context: ProjectContext,
  facets: string[],
): void {
  if (facets.includes("js")) {
    addJsTools(config);
  }

  if (!context.hasOpenSpec) {
    return;
  }

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

export function registerSinks(config: WorkspaceConfig, hasAgentSkills: boolean): void {
  config.sinks.console = {
    id: "console",
    plugin: "console",
    enabled: true,
  };

  if (hasAgentSkills) {
    config.sinks["agent-feedback"] = {
      id: "agent-feedback",
      plugin: "agent-feedback",
      enabled: true,
    };
  }
}

export function registerPipelines(config: WorkspaceConfig, context: ProjectContext): void {
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
  if (!context.hasOpenSpec || !config.sources.openspecSpecs) {
    return;
  }

  config.pipelines.push({
    id: "openspec-spec-conflicts",
    description: "Compare OpenSpec change specs through facet and agnostic analysis.",
    source: "openspecSpecs",
    analysis: {
      facet: enabledTools(config, ["specDocuments"]),
      agnostic: enabledTools(config, ["specConflict"]),
    },
    feedback: {
      sinks: ["console"],
    },
  });
}
