import type { SkillAgentId, SkillsConfig } from "../index.js";

export function createSelectedAgents(config: SkillsConfig): Set<SkillAgentId> {
  return new Set(config.agents);
}

export function validateSkillsConfig(config: SkillsConfig): void {
  const seenAgents = new Set<SkillAgentId>();

  for (const agentId of config.agents) {
    ensureUniqueAgent(agentId, seenAgents);
  }
}

function ensureUniqueAgent(agentId: SkillAgentId, seenAgents: Set<SkillAgentId>): void {
  if (seenAgents.has(agentId)) {
    throw new Error(`Duplicate agent id: ${agentId}`);
  }

  seenAgents.add(agentId);
}
