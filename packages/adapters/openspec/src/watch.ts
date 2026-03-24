import { watch as watchFs } from "node:fs";
import { resolve } from "node:path";
import { diffOpenSpecSnapshots, normalizeOpenSpecSnapshot } from "./events.js";
import { takeOpenSpecSnapshot } from "./status.js";
import type { WatchOptions } from "./types.js";

export async function watchOpenSpecChanges(options: WatchOptions): Promise<{ close: () => void }> {
  const changesDirectory = resolve(options.projectRoot, "openspec", "changes");
  let previousSnapshot = await takeOpenSpecSnapshot(options);

  for (const event of normalizeOpenSpecSnapshot(previousSnapshot, options.projectRoot)) {
    options.onEvent(event);
  }

  const clearDebounceTimer = options.clearDebounceTimer ?? clearTimeout;
  const setDebounceTimer =
    options.setDebounceTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const watchFactory =
    options.watchFactory ?? ((path, listener) => watchFs(path, { recursive: true }, listener));

  let debounceTimer: NodeJS.Timeout | undefined;
  const watcher = watchFactory(changesDirectory, () => {
    clearDebounceTimer(debounceTimer);
    debounceTimer = setDebounceTimer(async () => {
      const currentSnapshot = await takeOpenSpecSnapshot(options);
      for (const event of diffOpenSpecSnapshots(
        previousSnapshot,
        currentSnapshot,
        options.projectRoot,
      )) {
        options.onEvent(event);
      }
      previousSnapshot = currentSnapshot;
    }, options.debounceMs ?? 200);
  });

  return {
    close: () => {
      clearDebounceTimer(debounceTimer);
      watcher.close();
    },
  };
}
