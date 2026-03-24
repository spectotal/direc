import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { IGNORED_DIRECTORIES } from "./constants.js";

export async function walkRepository(
  repositoryRoot: string,
  currentDirectory = repositoryRoot,
): Promise<string[]> {
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      files.push(...(await walkRepository(repositoryRoot, join(currentDirectory, entry.name))));
      continue;
    }

    files.push(relative(repositoryRoot, join(currentDirectory, entry.name)));
  }

  return files.sort();
}

export async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const contents = await readFile(path, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
