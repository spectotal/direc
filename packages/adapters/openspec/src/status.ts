import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type {
  OpenSpecChangeStatus,
  OpenSpecSnapshot,
  OpenSpecTaskItem,
  SnapshotOptions,
} from "./types.js";

const execFileAsync = promisify(execFile);

export async function getActiveOpenSpecChanges(
  projectRoot: string,
  changeFilter?: string,
): Promise<string[]> {
  const changesDirectory = resolve(projectRoot, "openspec", "changes");

  if (!existsSync(changesDirectory)) {
    return [];
  }

  const entries = await readdir(changesDirectory, { withFileTypes: true });
  const changes = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name !== "archive" && !entry.name.startsWith("."),
    )
    .map((entry) => entry.name)
    .sort();

  if (!changeFilter) {
    return changes;
  }

  return changes.filter((change) => change === changeFilter);
}

export async function getOpenSpecChangeStatus(
  projectRoot: string,
  changeName: string,
): Promise<OpenSpecChangeStatus | null> {
  try {
    const { stdout } = await execFileAsync(
      "openspec",
      ["status", "--json", "--change", changeName],
      { cwd: projectRoot },
    );
    return extractJson<OpenSpecChangeStatus>(stdout);
  } catch {
    return null;
  }
}

export async function takeOpenSpecSnapshot(options: SnapshotOptions): Promise<OpenSpecSnapshot> {
  const listChanges = options.listChanges ?? getActiveOpenSpecChanges;
  const loadStatus = options.loadStatus ?? getOpenSpecChangeStatus;
  const loadTasks = options.loadTasks ?? readOpenSpecTasks;
  const changeNames = await listChanges(options.projectRoot, options.changeFilter);
  const snapshot: OpenSpecSnapshot = new Map();

  for (const changeName of changeNames) {
    const status = await loadStatus(options.projectRoot, changeName);
    if (status) {
      if (options.taskDiffs) {
        status.tasks = await loadTasks(options.projectRoot, changeName);
      }
      snapshot.set(changeName, status);
    }
  }

  return snapshot;
}

export async function readOpenSpecTasks(
  projectRoot: string,
  changeName: string,
): Promise<OpenSpecTaskItem[]> {
  const tasksPath = resolve(projectRoot, "openspec", "changes", changeName, "tasks.md");

  try {
    const contents = await readFile(tasksPath, "utf8");
    return parseOpenSpecTasks(contents, tasksPath);
  } catch {
    return [];
  }
}

export function parseOpenSpecTasks(contents: string, sourcePath: string): OpenSpecTaskItem[] {
  const tasks: OpenSpecTaskItem[] = [];

  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*[-*]\s+\[(?<checked>[ xX])\]\s+(?<text>.+?)\s*$/u);
    if (!match?.groups) {
      continue;
    }

    const rawText = match.groups.text?.trim();
    const checked = match.groups.checked?.toLowerCase();
    if (!rawText || !checked) {
      continue;
    }
    const { id, title } = splitTaskIdentity(rawText, tasks.length + 1);

    tasks.push({
      id,
      title,
      checked: checked === "x",
      sourcePath,
    });
  }

  return tasks;
}

function splitTaskIdentity(rawText: string, fallbackIndex: number): { id: string; title: string } {
  const match = rawText.match(/^(?<id>\d+(?:\.\d+)*)\s+(?<title>.+)$/u);

  if (!match?.groups?.id || !match.groups.title) {
    return {
      id: `task-${fallbackIndex}`,
      title: rawText,
    };
  }

  return {
    id: match.groups.id,
    title: match.groups.title,
  };
}

function extractJson<T>(output: string): T {
  const start = output.indexOf("{");
  if (start === -1) {
    throw new Error("Could not locate JSON payload in OpenSpec output.");
  }

  return JSON.parse(output.slice(start)) as T;
}
