import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { normalisePaths } from "@spectotal/direc-artifact-contracts";
import { filterPathsWithPatterns } from "./path-patterns.js";

const OPERATIONAL_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".direc",
  "coverage",
]);

export async function loadRepositoryPaths(
  repositoryRoot: string,
  excludePaths: readonly string[],
): Promise<string[]> {
  const allFiles = await listRepositoryFiles(repositoryRoot, repositoryRoot);
  const relativePaths = allFiles.map((path) => toRelativePath(repositoryRoot, path));

  return normalisePaths(
    filterPathsWithPatterns(relativePaths, excludePaths).map((path) =>
      resolve(repositoryRoot, path),
    ),
  );
}

export async function createPathSignature(paths: string[]): Promise<string> {
  const parts = await Promise.all(
    paths.map(async (path) => {
      try {
        const details = await stat(path);
        return `${path}:${details.mtimeMs}`;
      } catch {
        return `${path}:missing`;
      }
    }),
  );

  return parts.join("\0");
}

export function toRelativePath(repositoryRoot: string, path: string): string {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}

async function listRepositoryFiles(repositoryRoot: string, currentPath: string): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && OPERATIONAL_EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRepositoryFiles(repositoryRoot, entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(resolve(repositoryRoot, toRelativePath(repositoryRoot, entryPath)));
    }
  }

  return files;
}
