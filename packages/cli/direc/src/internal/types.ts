import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type { WorkspaceConfig as PipelineWorkspaceConfig } from "@spectotal/direc-pipeline-manager";
import type { SyncSkillsResult } from "@spectotal/direc-skills-manager";

export type SkillAgentId = "codex" | "claude" | "antigravity";

export interface SkillsWorkspaceConfig {
  agents: SkillAgentId[];
}

export interface SkillsPromptSession {
  selectAgents(options: { agents: SkillAgentId[] }): Promise<SkillAgentId[]>;
  close(): void;
}

export type WorkspaceConfig = Omit<PipelineWorkspaceConfig, "skills"> & {
  skills?: SkillsWorkspaceConfig;
};

export const SUPPORTED_SKILL_AGENTS: SkillAgentId[] = ["codex", "claude", "antigravity"];

export interface BuildWorkspaceConfigOptions {
  now?: () => Date;
  skills?: SkillsWorkspaceConfig;
}

export interface InitCommandOptions {
  agents?: SkillAgentId[];
  promptSession?: SkillsPromptSession;
  now?: () => Date;
}

export interface InitCommandResult {
  config: WorkspaceConfig;
  context: ProjectContext;
  configPath: string;
  skills: SyncSkillsResult;
}

export type InitArgOptions = Pick<InitCommandOptions, "agents">;
