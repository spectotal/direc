import type {
  SkillsProviderWorkspaceConfig,
  SkillsWorkspaceConfig,
} from "@spectotal/direc-pipeline-manager";
import type { InitCommandOptions } from "../types.js";
import { promptForProviderConfig, promptForProviders } from "./prompt-session.js";
import { buildProviderConfig } from "./providers.js";

export async function resolveSkillsConfig(
  options: InitCommandOptions,
): Promise<SkillsWorkspaceConfig> {
  const providers = await resolveSelectedProviders(options);
  if (providers.length === 0) {
    throw new Error("direc init requires --providers in non-interactive mode.");
  }

  return {
    providers: await resolveProviderConfigs(providers, options),
  };
}

async function resolveSelectedProviders(
  options: InitCommandOptions,
): Promise<NonNullable<InitCommandOptions["providers"]>> {
  if (options.providers && options.providers.length > 0) {
    return [...new Set(options.providers)];
  }

  if (options.interactive && options.prompt) {
    return promptForProviders(options.prompt);
  }

  return [];
}

async function resolveProviderConfigs(
  providers: NonNullable<InitCommandOptions["providers"]>,
  options: InitCommandOptions,
): Promise<SkillsProviderWorkspaceConfig[]> {
  const providerConfigs: SkillsProviderWorkspaceConfig[] = [];

  for (const provider of providers) {
    providerConfigs.push(await resolveProviderConfig(provider, options));
  }

  return providerConfigs;
}

async function resolveProviderConfig(
  provider: NonNullable<InitCommandOptions["providers"]>[number],
  options: InitCommandOptions,
): Promise<SkillsProviderWorkspaceConfig> {
  if (options.interactive && options.prompt) {
    return promptForProviderConfig(provider, options.prompt);
  }

  return buildProviderConfig(provider, options.installTargets ?? {});
}
