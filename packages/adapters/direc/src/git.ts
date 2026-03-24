import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { GitDiffPathOptions } from "./types.js";

const execFileAsync = promisify(execFile);

export async function getGitDiffPaths(options: GitDiffPathOptions): Promise<string[]> {
  try {
    const args =
      options.mode === "working_tree"
        ? [
            "diff",
            "--name-only",
            "--relative",
            await resolveWorkingTreeBaseline(options.repositoryRoot),
            "--",
          ]
        : ["diff", "--name-only", "--relative", options.diffSpec ?? "", "--"];
    const { stdout } = await execFileAsync("git", args, {
      cwd: options.repositoryRoot,
    });

    return stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => resolve(options.repositoryRoot, line))
      .sort();
  } catch {
    if (options.mode === "working_tree") {
      throw new Error("DIREC watch requires a git repository with a valid HEAD to diff against.");
    }

    const suffix = options.diffSpec ? ` for diff spec ${options.diffSpec}` : "";
    throw new Error(`Could not resolve git diff paths${suffix}.`);
  }
}

async function resolveWorkingTreeBaseline(repositoryRoot: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd: repositoryRoot,
    });

    return stdout.trim();
  } catch {
    throw new Error("DIREC watch requires a valid HEAD commit.");
  }
}
