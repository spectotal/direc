import type { SkillAgentId } from "../types.js";

export function parseAgentSelection(value: string): SkillAgentId {
  const agentId = value.trim();
  if (!agentId) {
    throw new Error("--agent requires an agent id.");
  }

  return normalizeAgentId(agentId);
}

export function normalizeAgentId(value: string): SkillAgentId {
  if (value === "codex" || value === "claude" || value === "antigravity") {
    return value;
  }

  throw new Error(`Unsupported skill agent: ${value}`);
}
