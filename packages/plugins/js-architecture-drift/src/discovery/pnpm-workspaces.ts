import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function readPnpmWorkspaces(repositoryRoot: string): Promise<string[]> {
  const pnpmWorkspaceFile = join(repositoryRoot, "pnpm-workspace.yaml");
  if (!existsSync(pnpmWorkspaceFile)) return [];
  try {
    const content = await readFile(pnpmWorkspaceFile, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-"))
      .map((line) => line.replace(/^-\s*["']?/, "").replace(/["']?$/, ""));
  } catch {
    return [];
  }
}
