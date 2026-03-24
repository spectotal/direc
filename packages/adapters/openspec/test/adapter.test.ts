import assert from "node:assert/strict";
import test from "node:test";
import { diffOpenSpecSnapshots, getStatusRevision, takeOpenSpecSnapshot } from "../src/index.js";

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
  assert.equal(events[0]?.type, "transition");
  assert.equal(events[0]?.artifact?.fromStatus, "ready");
  assert.equal(events[0]?.artifact?.toStatus, "done");
  assert.equal(events[1]?.type, "change_completed");
  assert.equal(getStatusRevision(current.get("demo")!), "tasks:done");
});
