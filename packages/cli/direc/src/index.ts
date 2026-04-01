export { initCommand, main, runCommand, watchCommand } from "./internal/commands.js";
export { detectProjectContext, pathExists } from "./internal/project-context.js";
export { createBuiltinRegistry } from "./internal/registry.js";
export { buildWorkspaceConfig } from "./internal/workspace-config.js";
export type {
  BuildWorkspaceConfigOptions,
  InitCommandOptions,
  InitCommandResult,
  SkillAgentId,
  SkillsPromptSession,
  SkillsWorkspaceConfig,
  WorkspaceConfig,
} from "./internal/types.js";
