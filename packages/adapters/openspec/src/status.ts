import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { OpenSpecChangeStatus, OpenSpecSnapshot, SnapshotOptions } from "./types.js";

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
  const changeNames = await listChanges(options.projectRoot, options.changeFilter);
  const snapshot: OpenSpecSnapshot = new Map();

  for (const changeName of changeNames) {
    const status = await loadStatus(options.projectRoot, changeName);
    if (status) {
      snapshot.set(changeName, status);
    }
  }

  return snapshot;
}

function extractJson<T>(output: string): T {
  const start = output.indexOf("{");
  if (start === -1) {
    throw new Error("Could not locate JSON payload in OpenSpec output.");
  }

  return JSON.parse(output.slice(start)) as T;
}
