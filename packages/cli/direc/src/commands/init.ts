import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  bootstrapAnalysisEnvironment,
  buildDirecConfig,
  ensureDirectory,
  EXAMPLE_SPEC_TEMPLATE,
  resolveAnalyzers,
  writeDirecConfig,
  writeFileSafe,
} from "direc-engine";

type InitOptions = {
  force?: boolean;
  extension?: string[];
};

export async function initCommand(options: InitOptions): Promise<void> {
  const rootDir = process.cwd();
  const specsDir = resolve(rootDir, "specs");
  const configFile = resolve(rootDir, ".direc/config.json");
  const exampleSpec = resolve(specsDir, "example.spec.md");

  await guardExistingConfig(configFile, options.force ?? false);
  await ensureDirectory(specsDir);
  await writeFileSafe(exampleSpec, EXAMPLE_SPEC_TEMPLATE, options.force);

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
  const configuredAnalyzerIds = Object.entries(config.analyzers)
    .filter(([, entry]) => entry.enabled !== false)
    .map(([analyzerId]) => analyzerId);

  if (configuredAnalyzerIds.length === 0) {
    throw new Error(
      [
        "No supported analyzer set could be resolved for this repository.",
        resolution.disabled
          .flatMap((entry) => entry.reasons.map((reason) => `- ${reason.message}`))
          .join("\n") || "- No supported facets were detected.",
      ].join("\n"),
    );
  }

  await writeDirecConfig(rootDir, config);

  process.stdout.write(`Initialized Direc workspace in ${rootDir}\n`);
  process.stdout.write(
    `Detected facets: ${environment.detectedFacets.map((facet) => facet.id).join(", ") || "none"}\n`,
  );
  process.stdout.write(`Workflow: ${config.workflow}\n`);
  process.stdout.write(`Enabled analyzers: ${configuredAnalyzerIds.join(", ") || "none"}\n`);
  process.stdout.write(
    `Quality routines: ${Object.keys(environment.qualityRoutines).join(", ") || "none"}\n`,
  );
  if (config.automation) {
    process.stdout.write(
      `Automation: ${config.automation.mode}, ${config.automation.invocation}, ${config.automation.transport.kind}\n`,
    );
  } else {
    process.stdout.write("Automation: not configured\n");
  }
  process.stdout.write(`Extensions: ${environment.extensionSources.join(", ") || "none"}\n`);
}

async function guardExistingConfig(configFile: string, force: boolean): Promise<void> {
  const existingPaths = [];

  if (await pathExists(configFile)) {
    existingPaths.push(configFile);
  }

  if (existingPaths.length > 0 && !force) {
    throw new Error(
      `Existing Direc configuration found:\n${existingPaths.join("\n")}\nRe-run with --force to overwrite.`,
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
