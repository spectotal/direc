import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ArtifactSeed } from "@spectotal/direc-artifact-contracts";
import { findFiles, loadWorkingTreePaths } from "./filesystem.js";

export async function loadTaskArtifacts(
  repositoryRoot: string,
  changeFilter?: string,
): Promise<ArtifactSeed[]> {
  const changesRoot = join(repositoryRoot, "openspec", "changes");
  const taskFiles = await findFiles(changesRoot, "tasks.md");
  const workingTreePaths = await loadWorkingTreePaths(repositoryRoot);
  const artifacts: ArtifactSeed[] = [];

  for (const filePath of taskFiles) {
    const changeId = relative(changesRoot, filePath).split("/")[0];
    if (!changeId || (changeFilter && changeId !== changeFilter)) {
      continue;
    }

    for (const task of await readCompletedTasks(filePath)) {
      artifacts.push({
        type: "source.openspec.task",
        scope: {
          kind: "task",
          changeId,
          taskId: task.taskId,
          paths: workingTreePaths,
        },
        payload: {
          changeId,
          taskId: task.taskId,
          title: task.title,
          taskPath: filePath,
          paths: workingTreePaths,
        },
      });
    }
  }

  return artifacts;
}

export async function loadSpecArtifacts(
  repositoryRoot: string,
  changeFilter?: string,
): Promise<ArtifactSeed[]> {
  const changesRoot = join(repositoryRoot, "openspec", "changes");
  const specFiles = await findFiles(changesRoot, "spec.md");
  const artifacts: ArtifactSeed[] = [];

  for (const filePath of specFiles) {
    const relativePath = relative(changesRoot, filePath);
    const [changeId, ...rest] = relativePath.split("/");
    if (!changeId || (changeFilter && changeId !== changeFilter) || rest[0] !== "specs") {
      continue;
    }

    const stableRelativePath = rest.slice(1).join("/");
    const stableSpecPath = join(repositoryRoot, "openspec", "specs", stableRelativePath);
    artifacts.push({
      type: "source.openspec.spec-change",
      scope: {
        kind: "spec",
        changeId,
        specPath: filePath,
        paths: [filePath, stableSpecPath],
      },
      payload: {
        changeId,
        changeSpecPath: filePath,
        stableSpecPath,
      },
    });
  }

  return artifacts;
}

async function readCompletedTasks(
  filePath: string,
): Promise<Array<{ taskId: string; title: string }>> {
  const contents = await readFile(filePath, "utf8");

  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^-\s+\[[xX]\]\s+/u.test(line))
    .map((line, index) => {
      const label = line.replace(/^-\s+\[[xX]\]\s+/u, "");
      const match = label.match(/^(?<id>\d+(?:\.\d+)*)\s+(?<title>.+)$/u);
      return {
        taskId: match?.groups?.id ?? `task-${index + 1}`,
        title: match?.groups?.title ?? label,
      };
    });
}
