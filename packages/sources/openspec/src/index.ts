import { readdir, readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, relative, resolve } from "node:path";
import type { ArtifactSeed } from "@spectotal/direc-artifact-contracts";
import type { SourcePlugin } from "@spectotal/direc-source-contracts";

const execFileAsync = promisify(execFile);

type OpenSpecOptions = {
  mode: "tasks" | "spec-change";
  changeFilter?: string;
  pollIntervalMs?: number;
};

export const openSpecSource: SourcePlugin<OpenSpecOptions> = {
  id: "openspec",
  displayName: "OpenSpec",
  seedArtifactTypes: ["source.openspec.task", "source.openspec.spec-change"],
  detect(context) {
    return context.hasOpenSpec;
  },
  async run(request) {
    const options = request.sourceConfig.options ?? { mode: "tasks" };
    return options.mode === "spec-change"
      ? loadSpecArtifacts(request.repositoryRoot, options.changeFilter)
      : loadTaskArtifacts(request.repositoryRoot, options.changeFilter);
  },
  async watch(request) {
    let previousSignature = "";
    const interval = setInterval(async () => {
      const seeds =
        request.sourceConfig.options?.mode === "spec-change"
          ? await loadSpecArtifacts(
              request.repositoryRoot,
              request.sourceConfig.options?.changeFilter,
            )
          : await loadTaskArtifacts(
              request.repositoryRoot,
              request.sourceConfig.options?.changeFilter,
            );
      const signature = JSON.stringify(
        await Promise.all(
          seeds.map(async (seed) => {
            const candidatePaths = seed.scope.paths ?? [];
            return candidatePaths.length > 0
              ? await createPathSignature(candidatePaths)
              : seed.type;
          }),
        ),
      );
      if (signature !== previousSignature) {
        previousSignature = signature;
        request.onChange();
      }
    }, request.sourceConfig.options?.pollIntervalMs ?? 1_000);

    return {
      close: () => {
        clearInterval(interval);
      },
    };
  },
};

async function loadTaskArtifacts(
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

    const contents = await readFile(filePath, "utf8");
    const tasks = contents
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

    for (const task of tasks) {
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

async function loadSpecArtifacts(
  repositoryRoot: string,
  changeFilter?: string,
): Promise<ArtifactSeed[]> {
  const changesRoot = join(repositoryRoot, "openspec", "changes");
  const specFiles = await findFiles(changesRoot, "spec.md");
  const artifacts: ArtifactSeed[] = [];

  for (const filePath of specFiles) {
    const relativePath = relative(changesRoot, filePath);
    const [changeId, ...rest] = relativePath.split("/");
    if (!changeId || (changeFilter && changeId !== changeFilter)) {
      continue;
    }

    if (rest[0] !== "specs") {
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

async function findFiles(root: string, fileName: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const entryPath = join(root, entry.name);
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

async function loadWorkingTreePaths(repositoryRoot: string): Promise<string[]> {
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
      .map((line) => {
        const raw = line.slice(3).trim();
        const renamed = raw.includes(" -> ") ? (raw.split(" -> ").at(-1) ?? raw) : raw;
        return resolve(repositoryRoot, renamed);
      })
      .sort();
  } catch {
    return [];
  }
}

async function createPathSignature(paths: string[]): Promise<string> {
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
