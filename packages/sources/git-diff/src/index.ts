import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { SourcePlugin } from "@spectotal/direc-source-contracts";

const execFileAsync = promisify(execFile);

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

async function loadGitPaths(repositoryRoot: string, diffSpec?: string): Promise<string[]> {
  try {
    if (diffSpec) {
      const { stdout } = await execFileAsync(
        "git",
        ["diff", "--name-only", "--diff-filter=ACMR", diffSpec],
        {
          cwd: repositoryRoot,
        },
      );
      return normalisePaths(repositoryRoot, stdout);
    }

    const { stdout } = await execFileAsync(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      {
        cwd: repositoryRoot,
      },
    );
    return stdout
      .split(/\r?\n/u)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0)
      .filter((line) => !line.slice(0, 2).includes("D"))
      .map((line) => {
        const raw = line.slice(3).trim();
        const renamed = raw.includes(" -> ") ? (raw.split(" -> ").at(-1) ?? raw) : raw;
        return resolve(repositoryRoot, renamed);
      })
      .sort();
  } catch {
    return [];
  }
}

function normalisePaths(repositoryRoot: string, output: string): string[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => resolve(repositoryRoot, line))
    .sort();
}
