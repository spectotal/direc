export type SkillAgentId = "codex" | "claude" | "antigravity";

export interface SkillsConfig {
  agents: SkillAgentId[];
}

export interface SkillDefinition {
  id: string;
  description: string;
  sourcePath: string;
  content: string;
  body: string;
  resourcesPath?: string;
}

export interface SkillBundleRecord {
  agent: SkillAgentId;
  skillId: string;
  deployedPath: string;
}

export interface SyncSkillsResult {
  deployments: SkillBundleRecord[];
}

export { loadSkillCatalog, validateSkillCatalog } from "./internal/catalog.js";
export { syncSkills } from "./internal/bundle.js";
