import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function loadGitPaths(repositoryRoot: string, diffSpec?: string): Promise<string[]> {
  try {
    if (diffSpec) {
      return await loadDiffSpecPaths(repositoryRoot, diffSpec);
    }

    return await loadWorkingTreePaths(repositoryRoot);
  } catch {
    return [];
  }
}

async function loadDiffSpecPaths(repositoryRoot: string, diffSpec: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", diffSpec],
    {
      cwd: repositoryRoot,
    },
  );

  return normaliseGitPaths(repositoryRoot, stdout);
}

async function loadWorkingTreePaths(repositoryRoot: string): Promise<string[]> {
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
    .map((line) => resolve(repositoryRoot, resolveRenamedPath(line)))
    .sort();
}

function normaliseGitPaths(repositoryRoot: string, output: string): string[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => resolve(repositoryRoot, line))
    .sort();
}

function resolveRenamedPath(line: string): string {
  const raw = line.slice(3).trim();
  return raw.includes(" -> ") ? (raw.split(" -> ").at(-1) ?? raw) : raw;
}
