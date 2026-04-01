import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import type {
  SkillProviderId,
  SkillsWorkspaceConfig,
  WorkspaceConfig,
} from "@spectotal/direc-pipeline-manager";
import type { SyncSkillsResult } from "@spectotal/direc-skills-manager";

export const DEFAULT_CODEX_SKILLS_INSTALL_TARGET = ".codex/skills";
export const SUPPORTED_SKILL_PROVIDERS: SkillProviderId[] = ["codex", "claude", "antigravity"];

export interface BuildWorkspaceConfigOptions {
  now?: () => Date;
  skills?: SkillsWorkspaceConfig;
}

export interface InitCommandOptions {
  providers?: SkillProviderId[];
  installTargets?: Partial<Record<SkillProviderId, string>>;
  interactive?: boolean;
  prompt?: (question: string) => Promise<string>;
  now?: () => Date;
}

export interface InitCommandResult {
  config: WorkspaceConfig;
  context: ProjectContext;
  configPath: string;
  skills: SyncSkillsResult;
}

export type InitArgOptions = Pick<InitCommandOptions, "providers" | "installTargets">;
