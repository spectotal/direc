import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { writeDirecConfig } from "direc-analysis-runtime";
import { detectRepositoryFacets } from "direc-facet-detect";
import { getRegisteredAnalyzers } from "../lib/analyzers.js";
import { buildDirecConfig } from "../lib/config.js";
import { ensureDirectory, writeFileSafe } from "../lib/fs.js";
import { EXAMPLE_SPEC_TEMPLATE } from "../lib/templates.js";

type InitOptions = {
  force?: boolean;
};

export async function initCommand(options: InitOptions): Promise<void> {
  const rootDir = process.cwd();
  const specsDir = resolve(rootDir, "specs");
  const configFile = resolve(rootDir, ".direc/config.json");
  const exampleSpec = resolve(specsDir, "example.spec.md");

  await guardExistingConfig(configFile, options.force ?? false);
  await ensureDirectory(specsDir);
  await writeFileSafe(exampleSpec, EXAMPLE_SPEC_TEMPLATE, options.force);

  const detectedFacets = await detectRepositoryFacets(rootDir);
  const { config, resolution } = await buildDirecConfig({
    repositoryRoot: rootDir,
    detectedFacets,
    plugins: getRegisteredAnalyzers(),
  });

  if (resolution.enabled.length === 0) {
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
    `Detected facets: ${detectedFacets.map((facet) => facet.id).join(", ") || "none"}\n`,
  );
  process.stdout.write(`Workflow: ${config.workflow}\n`);
  process.stdout.write(
    `Enabled analyzers: ${resolution.enabled.map((entry) => entry.plugin.id).join(", ")}\n`,
  );
  if (config.automation) {
    process.stdout.write(
      `Automation: ${config.automation.mode}, ${config.automation.invocation}, ${config.automation.transport.kind}\n`,
    );
  } else {
    process.stdout.write("Automation: not configured\n");
  }
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
