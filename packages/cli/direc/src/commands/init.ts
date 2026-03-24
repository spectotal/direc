import {
  bootstrapAnalysisEnvironment,
  buildDirecConfig,
  resolveAnalyzers,
  writeDirecConfig,
} from "direc-engine";
import { guardExistingConfig, resolveInitPaths, writeInitArtifacts } from "./init-files.js";
import { assertConfiguredAnalyzers, formatInitSummary } from "./init-output.js";

type InitOptions = {
  force?: boolean;
  extension?: string[];
};

export async function initCommand(options: InitOptions): Promise<void> {
  const rootDir = process.cwd();
  const paths = resolveInitPaths(rootDir);

  await guardExistingConfig(paths.configFile, options.force ?? false);
  await writeInitArtifacts(paths, options.force);

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

  await writeDirecConfig(rootDir, config);
  process.stdout.write(formatInitSummary(rootDir, config, environment, configuredAnalyzerIds));
}
