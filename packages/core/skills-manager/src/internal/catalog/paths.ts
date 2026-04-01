import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function resolveBundledDefinitionsDirectory(): Promise<string> {
  return resolveBundledDirectory("definitions");
}

export async function resolveBundledPartialsDirectory(): Promise<string> {
  return resolveBundledDirectory("partials");
}

export async function resolveOptionalDirectory(path: string): Promise<string | undefined> {
  try {
    const result = await stat(path);
    return result.isDirectory() ? path : undefined;
  } catch {
    return undefined;
  }
}

async function resolveBundledDirectory(segment: string): Promise<string> {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDirectory, "..", "..", "..", "catalog", segment),
    resolve(currentDirectory, "..", "..", "..", "..", "catalog", segment),
  ];

  for (const candidate of candidates) {
    const bundledDirectory = await resolveOptionalDirectory(candidate);
    if (bundledDirectory) {
      return bundledDirectory;
    }
  }

  throw new Error(`Bundled skills ${segment} directory not found.`);
}
