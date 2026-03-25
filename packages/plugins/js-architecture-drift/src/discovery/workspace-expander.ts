import { join, resolve } from "node:path";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function expandWorkspacePattern(
  repositoryRoot: string,
  pattern: string,
): Promise<string[]> {
  if (!pattern.includes("*")) return [pattern];

  const [prefix, suffix] = pattern.split("*");
  const baseDirectory = resolve(repositoryRoot, prefix || ".");
  if (!existsSync(baseDirectory)) return [];

  try {
    const entries = await readdir(baseDirectory, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith("."),
      )
      .map((entry) => join(prefix || ".", entry.name, suffix || ""))
      .map((entry) => entry.replace(/\\/g, "/").replace(/\/$/, "").replace(/^\.\//, ""))
      .sort();
  } catch {
    return [];
  }
}
