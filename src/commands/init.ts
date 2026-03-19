import { resolve } from "node:path";
import { ensureDirectory, writeFileSafe } from "../lib/fs.js";
import {
  DIREC_CONFIG_TEMPLATE,
  EXAMPLE_SPEC_TEMPLATE,
} from "../lib/templates.js";

type InitOptions = {
  force?: boolean;
};

export async function initCommand(options: InitOptions): Promise<void> {
  const rootDir = process.cwd();
  const specsDir = resolve(rootDir, "specs");
  const configFile = resolve(rootDir, "direc.config.json");
  const exampleSpec = resolve(specsDir, "example.spec.md");

  await ensureDirectory(specsDir);
  await writeFileSafe(configFile, DIREC_CONFIG_TEMPLATE, options.force);
  await writeFileSafe(exampleSpec, EXAMPLE_SPEC_TEMPLATE, options.force);

  process.stdout.write(`Initialized direc workspace in ${rootDir}\n`);
}
