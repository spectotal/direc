import assert from "node:assert/strict";
import test from "node:test";
import { watchOpenSpecChanges } from "../src/index.js";

test("watchOpenSpecChanges emits snapshot and transition events via injected watcher hooks", async () => {
  let currentStatus = {
    changeName: "demo",
    schemaName: "spec-driven",
    isComplete: false,
    artifacts: [
      {
        id: "tasks",
        outputPath: "tasks.md",
        status: "ready",
      },
    ],
  };
  const events: string[] = [];
  let triggerWatch: (() => void) | undefined;
  let debounceCallback: (() => void | Promise<void>) | undefined;
  let closed = false;

  const watcher = await watchOpenSpecChanges({
    projectRoot: process.cwd(),
    onEvent: (event) => {
      events.push(event.type);
    },
    async listChanges() {
      return ["demo"];
    },
    async loadStatus() {
      return currentStatus;
    },
    watchFactory: (_path, listener) => {
      triggerWatch = listener;
      return {
        close: () => {
          closed = true;
        },
      };
    },
    setDebounceTimer: (callback) => {
      debounceCallback = callback;
      return {} as NodeJS.Timeout;
    },
    clearDebounceTimer() {},
  });

  assert.deepEqual(events, ["snapshot"]);

  currentStatus = {
    ...currentStatus,
    isComplete: true,
    artifacts: [
      {
        id: "tasks",
        outputPath: "tasks.md",
        status: "done",
      },
    ],
  };

  triggerWatch?.();
  await debounceCallback?.();

  assert.deepEqual(events, ["snapshot", "transition", "change_completed"]);

  watcher.close();
  assert.equal(closed, true);
});
