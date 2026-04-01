import type { SkillAgentId } from "../index.js";

export function agentSkillsRoot(agentId: SkillAgentId): string {
  switch (agentId) {
    case "codex":
      return ".codex/skills";
    case "claude":
      return ".claude/skills";
    case "antigravity":
      return ".agent/skills";
  }
}
