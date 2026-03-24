import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_EVENT_TYPES } from "@spectotal/direc-workflow-runtime";
import { watchOpenSpecChanges } from "../src/watch.js";

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

  assert.deepEqual(events, [WORKFLOW_EVENT_TYPES.SNAPSHOT]);

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

  assert.deepEqual(events, [
    WORKFLOW_EVENT_TYPES.SNAPSHOT,
    WORKFLOW_EVENT_TYPES.TRANSITION,
    WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED,
  ]);

  watcher.close();
  assert.equal(closed, true);
});

test("watchOpenSpecChanges ignores no-op task file writes when task diffs are enabled", async () => {
  const currentStatus = {
    changeName: "demo",
    schemaName: "spec-driven",
    isComplete: false,
    artifacts: [
      {
        id: "tasks",
        outputPath: "tasks.md",
        status: "done",
      },
    ],
  };
  let currentTasks = [
    {
      id: "1.1",
      title: "Do the thing",
      checked: false,
      sourcePath: "/tmp/demo/tasks.md",
    },
  ];
  const events: string[] = [];
  let triggerWatch: (() => void) | undefined;
  let debounceCallback: (() => void | Promise<void>) | undefined;

  const watcher = await watchOpenSpecChanges({
    projectRoot: process.cwd(),
    taskDiffs: true,
    onEvent: (event) => {
      events.push(event.type);
    },
    async listChanges() {
      return ["demo"];
    },
    async loadStatus() {
      return currentStatus;
    },
    async loadTasks() {
      return currentTasks;
    },
    watchFactory: (_path, listener) => {
      triggerWatch = listener;
      return {
        close() {},
      };
    },
    setDebounceTimer: (callback) => {
      debounceCallback = callback;
      return {} as NodeJS.Timeout;
    },
    clearDebounceTimer() {},
  });

  assert.deepEqual(events, [WORKFLOW_EVENT_TYPES.SNAPSHOT]);

  currentTasks = [
    {
      id: "1.1",
      title: "Do the thing but with new wording",
      checked: false,
      sourcePath: "/tmp/demo/tasks.md",
    },
  ];

  triggerWatch?.();
  await debounceCallback?.();

  assert.deepEqual(events, [WORKFLOW_EVENT_TYPES.SNAPSHOT]);

  watcher.close();
});
