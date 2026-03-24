import { basename, join, resolve } from "node:path";
import { readdir } from "node:fs/promises";
import { readJsonFile } from "./filesystem.js";
import type { PackageBoundary, PackageManifest } from "./types.js";
import { dedupeBy, findSourcePathsForRoot, normalizeWorkspaces } from "./workspace-utils.js";

export async function collectPackageBoundaries(
  repositoryRoot: string,
  files: string[],
): Promise<PackageBoundary[]> {
  const rootManifest = await readJsonFile<PackageManifest>(join(repositoryRoot, "package.json"));
  const workspacePatterns = normalizeWorkspaces(rootManifest?.workspaces);
  const boundaries: PackageBoundary[] = [];

  if (rootManifest) {
    boundaries.push({
      name: rootManifest.name ?? basename(repositoryRoot),
      root: ".",
      sourcePaths: findSourcePathsForRoot(files, "."),
    });
  }

  for (const pattern of workspacePatterns) {
    const workspaceRoots = await expandWorkspacePattern(repositoryRoot, pattern);
    for (const workspaceRoot of workspaceRoots) {
      const manifest = await readJsonFile<PackageManifest>(
        join(repositoryRoot, workspaceRoot, "package.json"),
      );

      if (!manifest) {
        continue;
      }

      boundaries.push({
        name: manifest.name ?? basename(workspaceRoot),
        root: workspaceRoot,
        sourcePaths: findSourcePathsForRoot(files, workspaceRoot),
      });
    }
  }

  return dedupeBy(boundaries, (boundary) => boundary.root);
}

export async function expandWorkspacePattern(
  repositoryRoot: string,
  pattern: string,
): Promise<string[]> {
  if (!pattern.includes("*")) {
    return [pattern];
  }

  const [prefix, suffix] = pattern.split("*");
  const baseDirectory = resolve(repositoryRoot, prefix || ".");
  const entries = await readdir(baseDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(prefix || ".", entry.name, suffix || ""))
    .map((entry) => entry.replace(/\\/g, "/").replace(/\/$/, "").replace(/^\.\//, ""))
    .sort();
}
