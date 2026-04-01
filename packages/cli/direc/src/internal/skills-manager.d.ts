declare module "@spectotal/direc-skills-manager" {
  export type SkillAgentId = "codex" | "claude" | "antigravity";

  export interface SkillsConfig {
    agents: SkillAgentId[];
  }

  export interface SkillBundleRecord {
    agent: SkillAgentId;
    skillId: string;
    deployedPath: string;
  }

  export interface SyncSkillsResult {
    deployments: SkillBundleRecord[];
  }

  export interface SkillDefinition {
    id: string;
    description: string;
    sourcePath: string;
    content: string;
    body: string;
    resourcesPath?: string;
  }

  export function loadSkillCatalog(): Promise<SkillDefinition[]>;

  export function validateSkillCatalog(catalog: SkillDefinition[]): void;

  export function syncSkills(options: {
    repositoryRoot: string;
    config: SkillsConfig;
  }): Promise<SyncSkillsResult>;
}
