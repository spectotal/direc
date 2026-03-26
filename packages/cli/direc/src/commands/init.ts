import { formatNextStepNotice, scaffoldInitBundles } from "@spectotal/direc-agent-skills";
import {
  bootstrapAnalysisEnvironment,
  buildDirecConfig,
  ensureDirectory,
  resolveAnalyzers,
  writeDirecConfig,
} from "@spectotal/direc-engine";
import { resolveSelectedAgents, type InitAgentDependencies } from "./init-agents.js";
import { guardExistingConfig, resolveInitPaths } from "./init-files.js";
import { assertConfiguredAnalyzers, formatInitSummary } from "./init-output.js";

type InitOptions = {
  force?: boolean;
  agent?: string[];
  extension?: string[];
};

type InitCommandDependencies = InitAgentDependencies;

export async function initCommand(
  options: InitOptions,
  dependencies: InitCommandDependencies = {},
): Promise<void> {
  const rootDir = process.cwd();
  const paths = resolveInitPaths(rootDir);
  const stdout = dependencies.stdout ?? process.stdout;

  await guardExistingConfig(paths.configFile, options.force ?? false);
  const selectedAgents = await resolveSelectedAgents(options.agent, dependencies);
  await ensureDirectory(paths.specsDir);

  const environment = await bootstrapAnalysisEnvironment({
    repositoryRoot: rootDir,
    cliExtensions: options.extension,
  });
  const { config } = await buildDirecConfig({
    repositoryRoot: rootDir,
    detectedFacets: environment.detectedFacets,
    plugins: environment.analyzers,
    extensions: environment.extensionSources,
    qualityRoutines: environment.qualityRoutines,
  });
  const resolution = await resolveAnalyzers({
    plugins: environment.analyzers,
    repositoryRoot: rootDir,
    detectedFacets: environment.detectedFacets,
    config: config.analyzers,
  });
  const configuredAnalyzerIds = assertConfiguredAnalyzers(config, resolution);
  const nextStep = formatNextStepNotice("direc-bound", selectedAgents);

  await writeDirecConfig(rootDir, config);
  await scaffoldInitBundles({
    repositoryRoot: rootDir,
    agents: selectedAgents,
    bundles: ["direc-bound"],
    force: options.force,
  });
  stdout.write(
    formatInitSummary(rootDir, config, environment, configuredAnalyzerIds, {
      selectedAgents,
      nextStep,
    }),
  );
}
