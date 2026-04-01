import type { SourcePlugin } from "@spectotal/direc-source-contracts";
import { loadGitPaths } from "./git-paths.js";

type GitDiffOptions = {
  diffSpec?: string;
  pollIntervalMs?: number;
};

export const gitDiffSource: SourcePlugin<GitDiffOptions> = {
  id: "git-diff",
  displayName: "Git Diff",
  seedArtifactTypes: ["source.diff.scope"],
  detect(context) {
    return context.hasGit;
  },
  async run(request) {
    const paths = await loadGitPaths(
      request.repositoryRoot,
      request.sourceConfig.options?.diffSpec,
    );

    return [
      {
        type: "source.diff.scope",
        scope: {
          kind: "paths",
          paths,
        },
        payload: {
          diffSpec: request.sourceConfig.options?.diffSpec ?? null,
          paths,
        },
      },
    ];
  },
  async watch(request) {
    let previousSignature = "";
    const interval = setInterval(async () => {
      const paths = await loadGitPaths(
        request.repositoryRoot,
        request.sourceConfig.options?.diffSpec,
      );
      const signature = paths.join("\0");
      if (signature !== previousSignature) {
        previousSignature = signature;
        request.onChange();
      }
    }, request.sourceConfig.options?.pollIntervalMs ?? 1_000);

    return {
      close: () => {
        clearInterval(interval);
      },
    };
  },
};
