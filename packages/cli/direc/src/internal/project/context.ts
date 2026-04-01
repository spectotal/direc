import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { ProjectContext } from "@spectotal/direc-artifact-contracts";
import { createFacetDetectionState, recordProjectEntry, sortProjectFacets } from "./facets.js";
import { walkRepository } from "./walk.js";

const execFileAsync = promisify(execFile);

export async function detectProjectContext(repositoryRoot: string): Promise<ProjectContext> {
  const resolvedRepositoryRoot = resolve(repositoryRoot);
  const state = createFacetDetectionState();

  await walkRepository(resolvedRepositoryRoot, (filePath, entryName) => {
    recordProjectEntry(state, filePath, entryName);
  });

  return {
    repositoryRoot: resolvedRepositoryRoot,
    facets: sortProjectFacets(state.facets),
    sourceFiles: [...new Set(state.sourceFiles)].sort(),
    hasGit: await detectGitRepository(repositoryRoot),
    hasOpenSpec: state.hasOpenSpec,
  };
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectGitRepository(repositoryRoot: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], {
      cwd: repositoryRoot,
    });
    return true;
  } catch {
    return false;
  }
}
