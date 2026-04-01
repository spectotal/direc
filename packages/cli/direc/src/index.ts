export { initCommand, main, runCommand, watchCommand } from "./internal/commands.js";
export { detectProjectContext, pathExists } from "./internal/project-context.js";
export { analysisThresholdRule, createBuiltinRegistry } from "./internal/registry.js";
export { buildWorkspaceConfig } from "./internal/workspace-config.js";
export type {
  BuildWorkspaceConfigOptions,
  InitCommandOptions,
  InitCommandResult,
} from "./internal/types.js";
