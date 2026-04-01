import type { SkillAgentId, SyncSkillsResult, SkillsConfig } from "../index.js";
import { loadSkillCatalog, validateSkillCatalog } from "./catalog.js";
import { createSelectedAgents, validateSkillsConfig } from "./config.js";
import { syncAgentSkills } from "./deploy.js";
import { loadPartials, renderTemplate } from "./render.js";

const ALL_AGENTS: SkillAgentId[] = ["codex", "claude", "antigravity"];

export async function syncSkills(options: {
  repositoryRoot: string;
  config: SkillsConfig;
}): Promise<SyncSkillsResult> {
  const catalog = await loadSkillCatalog();
  validateSkillCatalog(catalog);
  validateSkillsConfig(options.config);

  const partials = await loadPartials();
  const bundledSkillIds = new Set(catalog.map((skill) => skill.id));
  const selectedAgents = createSelectedAgents(options.config);
  const deployments = await Promise.all(
    ALL_AGENTS.map((agentId) =>
      syncAgentSkills({
        repositoryRoot: options.repositoryRoot,
        agentId,
        selected: selectedAgents.has(agentId),
        bundledSkillIds,
        catalog,
        partials,
        renderSkill,
      }),
    ),
  );

  return {
    deployments: deployments.flat(),
  };
}

function renderSkill(
  skill: { id: string; description: string; content: string },
  partials: Map<string, string>,
): string {
  return renderTemplate(skill.content, partials, {
    id: skill.id,
    description: skill.description,
  });
}
