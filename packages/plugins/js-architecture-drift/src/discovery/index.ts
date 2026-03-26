import { basename, join } from "node:path";
import { existsSync } from "node:fs";
import { readJsonFile, getWorkspacesFromManifest } from "./package-manifest.js";
import { readPnpmWorkspaces } from "./pnpm-workspaces.js";
import { expandWorkspacePattern } from "./workspace-expander.js";

export type PackageBoundary = {
  name: string;
  root: string;
};

async function resolveManifestBoundary(
  repositoryRoot: string,
  workspaceRoot: string,
): Promise<PackageBoundary | null> {
  const manifest = await readJsonFile(join(repositoryRoot, workspaceRoot, "package.json"));
  return manifest ? { name: manifest.name ?? basename(workspaceRoot), root: workspaceRoot } : null;
}

async function collectBoundariesFromPatterns(
  repositoryRoot: string,
  patterns: string[],
): Promise<PackageBoundary[]> {
  const allWorkspaceRoots = await Promise.all(
    patterns.map((p) => expandWorkspacePattern(repositoryRoot, p)),
  );
  const flattenedRoots = allWorkspaceRoots.flat();
  const boundaries = await Promise.all(
    flattenedRoots.map((root) => resolveManifestBoundary(repositoryRoot, root)),
  );
  return boundaries.filter((b): b is PackageBoundary => b !== null);
}

export async function discoverPackageBoundaries(
  repositoryRoot: string,
): Promise<PackageBoundary[]> {
  const rootManifest = await readJsonFile(join(repositoryRoot, "package.json"));
  let patterns = getWorkspacesFromManifest(rootManifest);

  if (patterns.length === 0) {
    patterns = await readPnpmWorkspaces(repositoryRoot);
  }

  const discovered = await collectBoundariesFromPatterns(repositoryRoot, patterns);
  const rootBoundary = { name: rootManifest?.name ?? basename(repositoryRoot), root: "." };

  const all = [rootBoundary, ...discovered];
  const seen = new Set<string>();
  return all.filter((b) => !seen.has(b.root) && seen.add(b.root));
}

export async function discoverTsConfigPaths(repositoryRoot: string): Promise<string[]> {
  return existsSync(join(repositoryRoot, "tsconfig.json")) ? ["tsconfig.json"] : [];
}
