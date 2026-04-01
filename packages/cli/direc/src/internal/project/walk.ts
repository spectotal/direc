import { readdir } from "node:fs/promises";
import { join } from "node:path";

const IGNORED_DIRECTORY_NAMES = new Set(["node_modules", ".git", "dist", ".direc", "coverage"]);

export async function walkRepository(
  currentPath: string,
  onFile: (filePath: string, entryName: string) => void | Promise<void>,
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }

    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await onFile(entryPath, entry.name);
      await walkRepository(entryPath, onFile);
      continue;
    }

    await onFile(entryPath, entry.name);
  }
}
