import { access } from "node:fs/promises";
import { resolve } from "node:path";

export type InitPaths = {
  specsDir: string;
  configFile: string;
  exampleSpec: string;
};

export function resolveInitPaths(repositoryRoot: string): InitPaths {
  const specsDir = resolve(repositoryRoot, "specs");

  return {
    specsDir,
    configFile: resolve(repositoryRoot, ".direc/config.json"),
    exampleSpec: resolve(specsDir, "example.spec.md"),
  };
}

export async function guardExistingConfig(configFile: string, force: boolean): Promise<void> {
  const existingPaths: string[] = [];

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
