import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { WORKFLOW_EVENT_TYPES } from "@spectotal/direc-workflow-runtime";
import { diffOpenSpecSnapshots, getStatusRevision } from "../src/events.js";
import { parseOpenSpecTasks, takeOpenSpecSnapshot } from "../src/status.js";

test("takeOpenSpecSnapshot respects change filtering", async () => {
  const snapshot = await takeOpenSpecSnapshot({
    projectRoot: process.cwd(),
    changeFilter: "selected-change",
    async listChanges(_projectRoot, changeFilter) {
      return ["selected-change", "other-change"].filter(
        (change) => !changeFilter || change === changeFilter,
      );
    },
    async loadStatus(_projectRoot, changeName) {
      return {
        changeName,
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
    },
  });

  assert.deepEqual([...snapshot.keys()], ["selected-change"]);
});

test("diffOpenSpecSnapshots emits transition events with normalized metadata", () => {
  const previous = new Map([
    [
      "demo",
      {
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
      },
    ],
  ]);
  const current = new Map([
    [
      "demo",
      {
        changeName: "demo",
        schemaName: "spec-driven",
        isComplete: true,
        artifacts: [
          {
            id: "tasks",
            outputPath: "tasks.md",
            status: "done",
          },
        ],
      },
    ],
  ]);

  const events = diffOpenSpecSnapshots(previous, current, process.cwd());

  assert.equal(events.length, 2);
  assert.equal(events[0]?.type, WORKFLOW_EVENT_TYPES.TRANSITION);
  assert.equal(events[0]?.artifact?.fromStatus, "ready");
  assert.equal(events[0]?.artifact?.toStatus, "done");
  assert.equal(events[1]?.type, WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED);
  assert.equal(getStatusRevision(current.get("demo")!), "tasks:done");
});

test("diffOpenSpecSnapshots emits work item transitions for checkbox changes", () => {
  const tasksPath = join(process.cwd(), "openspec", "changes", "demo", "tasks.md");
  const previous = new Map([
    [
      "demo",
      {
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
        tasks: parseOpenSpecTasks("- [ ] 1.1 Do the thing\n- [x] 1.2 Ship it\n", tasksPath),
      },
    ],
  ]);
  const current = new Map([
    [
      "demo",
      {
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
        tasks: parseOpenSpecTasks("- [x] 1.1 Do the thing\n- [ ] 1.2 Ship it\n", tasksPath),
      },
    ],
  ]);

  const events = diffOpenSpecSnapshots(previous, current, process.cwd()).filter(
    (event) => event.type === WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION,
  );

  assert.equal(events.length, 2);
  assert.equal(events[0]?.workItem?.id, "1.1");
  assert.equal(events[0]?.workItem?.fromState, "pending");
  assert.equal(events[0]?.workItem?.toState, "done");
  assert.equal(events[1]?.workItem?.id, "1.2");
  assert.equal(events[1]?.workItem?.fromState, "done");
  assert.equal(events[1]?.workItem?.toState, "pending");
});

test("diffOpenSpecSnapshots ignores task reordering and description edits without checkbox changes", () => {
  const tasksPath = join(process.cwd(), "openspec", "changes", "demo", "tasks.md");
  const previous = new Map([
    [
      "demo",
      {
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
        tasks: parseOpenSpecTasks("- [ ] 1.1 First title\n- [x] 1.2 Second title\n", tasksPath),
      },
    ],
  ]);
  const current = new Map([
    [
      "demo",
      {
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
        tasks: parseOpenSpecTasks(
          "- [x] 1.2 Second title revised\n- [ ] 1.1 First title revised\n",
          tasksPath,
        ),
      },
    ],
  ]);

  const events = diffOpenSpecSnapshots(previous, current, process.cwd()).filter(
    (event) => event.type === WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION,
  );

  assert.equal(events.length, 0);
});
