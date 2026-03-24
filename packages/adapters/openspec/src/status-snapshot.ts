import {
  getActiveOpenSpecChanges,
  getOpenSpecChangeStatus,
  readOpenSpecTasks,
} from "./status-io.js";
import type {
  OpenSpecChangeStatus,
  OpenSpecSnapshot,
  OpenSpecTaskItem,
  SnapshotOptions,
} from "./types.js";

type SnapshotLoaders = {
  listChanges: (projectRoot: string, changeFilter?: string) => Promise<string[]>;
  loadStatus: (projectRoot: string, changeName: string) => Promise<OpenSpecChangeStatus | null>;
  loadTasks: (projectRoot: string, changeName: string) => Promise<OpenSpecTaskItem[]>;
};

export async function takeOpenSpecSnapshot(options: SnapshotOptions): Promise<OpenSpecSnapshot> {
  const loaders = resolveSnapshotLoaders(options);
  const changeNames = await loaders.listChanges(options.projectRoot, options.changeFilter);
  const snapshot: OpenSpecSnapshot = new Map();

  for (const changeName of changeNames) {
    const status = await loaders.loadStatus(options.projectRoot, changeName);

    if (!status) {
      continue;
    }

    if (options.taskDiffs) {
      status.tasks = await loaders.loadTasks(options.projectRoot, changeName);
    }

    snapshot.set(changeName, status);
  }

  return snapshot;
}

function resolveSnapshotLoaders(options: SnapshotOptions): SnapshotLoaders {
  return {
    listChanges: options.listChanges ?? getActiveOpenSpecChanges,
    loadStatus: options.loadStatus ?? getOpenSpecChangeStatus,
    loadTasks: options.loadTasks ?? readOpenSpecTasks,
  };
}
