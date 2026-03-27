import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { normalisePaths } from "@spectotal/direc-artifact-contracts";
import type { SourcePlugin } from "@spectotal/direc-source-contracts";
import { filterPathsWithPatterns } from "./path-patterns.js";

export type RepositorySourceOptions = {
  excludePaths: string[];
  pollIntervalMs?: number;
};

export const DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS = [
  "**/dist/**",
  "**/test/**",
  "**/tests/**",
  "**/__tests__/**",
  "**/fixtures/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.d.ts",
  "**/*.d.ts.map",
  "scripts/**",
] as const;

const OPERATIONAL_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  ".direc",
  "coverage",
]);

export const repositorySource: SourcePlugin<RepositorySourceOptions> = {
  id: "repository",
  displayName: "Repository",
  seedArtifactTypes: ["source.repository.scope"],
  detect: () => true,
  async run(request) {
    const excludePaths = normalizeExcludePaths(request.sourceConfig.options?.excludePaths);
    const paths = await loadRepositoryPaths(request.repositoryRoot, excludePaths);

    return [
      {
        type: "source.repository.scope",
        scope: {
          kind: "paths",
          paths,
        },
        payload: {
          paths,
          excludePaths,
        },
      },
    ];
  },
  async watch(request) {
    const excludePaths = normalizeExcludePaths(request.sourceConfig.options?.excludePaths);
    let previousSignature = await createPathSignature(
      await loadRepositoryPaths(request.repositoryRoot, excludePaths),
    );

    const interval = setInterval(async () => {
      try {
        const signature = await createPathSignature(
          await loadRepositoryPaths(request.repositoryRoot, excludePaths),
        );
        if (signature !== previousSignature) {
          previousSignature = signature;
          request.onChange();
        }
      } catch {
        return;
      }
    }, request.sourceConfig.options?.pollIntervalMs ?? 1_000);

    return {
      close: () => {
        clearInterval(interval);
      },
    };
  },
};

async function loadRepositoryPaths(
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

async function createPathSignature(paths: string[]): Promise<string> {
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

function normalizeExcludePaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function toRelativePath(repositoryRoot: string, path: string): string {
  return relative(repositoryRoot, path).replaceAll("\\", "/");
}
