import type { InitCommandOptions, SkillAgentId, SkillsWorkspaceConfig } from "../types.js";
import { SUPPORTED_SKILL_AGENTS } from "../types.js";

export async function resolveSkillsConfig(
  options: InitCommandOptions,
): Promise<SkillsWorkspaceConfig> {
  const agents = await resolveSelectedAgents(options);
  if (agents.length === 0) {
    throw new Error("direc init requires --agent in non-interactive mode.");
  }

  return {
    agents: validateAgentSelections(agents),
  };
}

async function resolveSelectedAgents(
  options: InitCommandOptions,
): Promise<NonNullable<InitCommandOptions["agents"]>> {
  if (options.agents && options.agents.length > 0) {
    return [...options.agents];
  }

  if (options.promptSession) {
    return selectAgentsInteractively(options.promptSession, SUPPORTED_SKILL_AGENTS);
  }

  return [];
}

async function selectAgentsInteractively(
  promptSession: NonNullable<InitCommandOptions["promptSession"]>,
  supportedAgents: SkillAgentId[],
): Promise<SkillAgentId[]> {
  return promptSession.selectAgents({ agents: supportedAgents });
}

function validateAgentSelections(agents: SkillAgentId[]): SkillAgentId[] {
  const seenAgents = new Set<SkillAgentId>();

  return agents.map((agent) => {
    if (seenAgents.has(agent)) {
      throw new Error(`Duplicate agent: ${agent}`);
    }

    seenAgents.add(agent);
    return agent;
  });
}
