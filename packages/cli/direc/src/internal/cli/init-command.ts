import { writeWorkspaceConfig } from "@spectotal/direc-pipeline-manager";
import { syncSkills } from "@spectotal/direc-skills-manager";
import { detectProjectContext } from "../project-context.js";
import { resolveSkillsConfig } from "../skills-config.js";
import { buildWorkspaceConfig } from "../workspace-config.js";
import type { InitCommandOptions, InitCommandResult } from "../types.js";

export async function initCommand(repositoryRoot: string): Promise<InitCommandResult>;
export async function initCommand(
  repositoryRoot: string,
  options: InitCommandOptions,
): Promise<InitCommandResult>;
export async function initCommand(
  repositoryRoot: string,
  options: InitCommandOptions = {},
): Promise<InitCommandResult> {
  const context = await detectProjectContext(repositoryRoot);
  const skillsConfig = await resolveSkillsConfig(options);
  const config = buildWorkspaceConfig(context, {
    now: options.now,
    skills: skillsConfig,
  });
  const configPath = await writeWorkspaceConfig(repositoryRoot, config);
  const skills = await syncSkills({
    repositoryRoot,
    config: {
      providers: skillsConfig.providers,
    },
    now: options.now,
  });

  return {
    config,
    context,
    configPath,
    skills,
  };
}

export function writeInitSummary(result: InitCommandResult): void {
  process.stdout.write(`wrote ${result.configPath}\n`);
  process.stdout.write(
    `facets: ${result.context.facets.map((facet) => facet.id).join(", ") || "none"}\n`,
  );
  process.stdout.write(
    `pipelines: ${result.config.pipelines.map((pipeline) => pipeline.id).join(", ") || "none"}\n`,
  );
  process.stdout.write(
    `skills: ${
      result.config.skills?.providers
        .map((provider) => `${provider.id}:${provider.installMode}`)
        .join(", ") || "none"
    }\n`,
  );
}
