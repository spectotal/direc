import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type { BuildWorkspaceConfigOptions, WorkspaceConfig } from "./types.js";
import {
  registerPipelines,
  registerSinks,
  registerSources,
  registerTools,
} from "./workspace-config-helpers.js";

export function buildWorkspaceConfig(
  context: ProjectContext,
  options: BuildWorkspaceConfigOptions = {},
): WorkspaceConfig {
  const now = options.now ?? (() => new Date());
  const facets = context.facets.map((facet) => facet.id);
  const hasAgentSkills = (options.skills?.agents.length ?? 0) > 0;
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

  registerSources(config, context);
  registerTools(config, context, facets);
  registerSinks(config, hasAgentSkills);
  registerPipelines(config, context);

  return config;
}
