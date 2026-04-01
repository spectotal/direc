import type { SourcePlugin } from "@spectotal/direc-source-contracts";
import { createPathSignature, loadRepositoryPaths } from "./repository-paths.js";

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

function normalizeExcludePaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}
