import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function findFiles(root: string, fileName: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const entryPath = `${root}/${entry.name}`;
      if (entry.isDirectory()) {
        results.push(...(await findFiles(entryPath, fileName)));
      } else if (entry.isFile() && entry.name === fileName) {
        results.push(entryPath);
      }
    }

    return results.sort();
  } catch {
    return [];
  }
}

export async function loadWorkingTreePaths(repositoryRoot: string): Promise<string[]> {
  try {
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
      .map((line) => resolve(repositoryRoot, resolveRenamedPath(line)))
      .sort();
  } catch {
    return [];
  }
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

function resolveRenamedPath(line: string): string {
  const raw = line.slice(3).trim();
  return raw.includes(" -> ") ? (raw.split(" -> ").at(-1) ?? raw) : raw;
}
