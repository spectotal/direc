import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { extractJson } from "./status-json.js";
import { parseOpenSpecTasks } from "./status-tasks.js";
import type { OpenSpecChangeStatus, OpenSpecTaskItem } from "./types.js";

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
  const changes: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "archive" || entry.name.startsWith(".")) {
      continue;
    }

    if (!changeFilter || entry.name === changeFilter) {
      changes.push(entry.name);
    }
  }

  changes.sort();
  return changes;
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
