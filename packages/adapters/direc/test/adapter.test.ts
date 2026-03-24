import assert from "node:assert/strict";
import { resolve } from "node:path";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import test from "node:test";
import { WORKFLOW_EVENT_TYPES, WORKFLOW_IDS } from "@spectotal/direc-workflow-runtime";
import { createDirecWorkflowAdapter } from "../src/index.js";

test("DIREC adapter emits a repository snapshot by default", async () => {
  const adapter = createDirecWorkflowAdapter({
    now: () => new Date("2026-03-24T12:00:00.000Z"),
  });

  const events = await adapter.loadAnalysisEvents({
    repositoryRoot: "/tmp/direc-repository",
  });

  assert.deepEqual(events, [
    {
      type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
      source: WORKFLOW_IDS.DIREC,
      timestamp: "2026-03-24T12:00:00.000Z",
      repositoryRoot: "/tmp/direc-repository",
      metadata: {
        scope: "repository",
      },
    },
  ]);
});

test("DIREC adapter scopes snapshots from git diff paths", async () => {
  const adapter = createDirecWorkflowAdapter({
    now: () => new Date("2026-03-24T12:00:00.000Z"),
    async loadGitDiffPaths({ repositoryRoot, diffSpec }) {
      assert.equal(diffSpec, "main...HEAD");
      return [resolve(repositoryRoot, "src", "feature.ts")];
    },
  });

  const events = await adapter.loadAnalysisEvents({
    repositoryRoot: "/tmp/direc-repository",
    changeFilter: "main...HEAD",
  });

  assert.deepEqual(events, [
    {
      type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
      source: WORKFLOW_IDS.DIREC,
      timestamp: "2026-03-24T12:00:00.000Z",
      repositoryRoot: "/tmp/direc-repository",
      pathScopes: ["/tmp/direc-repository/src/feature.ts"],
      pathScopeMode: "strict",
      metadata: {
        diffSpec: "main...HEAD",
        scope: "git-diff",
      },
    },
  ]);
});

test("DIREC watch polls git diff and only emits when the scope changes", async () => {
  const emittedScopes: Array<string[] | undefined> = [];
  const diffSequences = [
    [],
    [],
    ["/tmp/direc-repository/src/feature.ts"],
    ["/tmp/direc-repository/src/feature.ts"],
  ];
  let pollCallback: (() => void | Promise<void>) | undefined;
  let clearCalled = false;
  const adapter = createDirecWorkflowAdapter({
    now: () => new Date("2026-03-24T12:00:00.000Z"),
    async loadGitDiffPaths() {
      return diffSequences.shift() ?? [];
    },
    setPollInterval(callback) {
      pollCallback = callback;
      return {} as NodeJS.Timeout;
    },
    clearPollInterval() {
      clearCalled = true;
    },
  });

  const watcher = await adapter.watchEvents({
    repositoryRoot: "/tmp/direc-repository",
    onEvent: (event) => {
      emittedScopes.push(event.pathScopes);
    },
  });

  assert.deepEqual(emittedScopes, [undefined]);

  await pollCallback?.();
  await waitForImmediate();
  assert.deepEqual(emittedScopes, [undefined]);

  await pollCallback?.();
  await waitForImmediate();
  assert.deepEqual(emittedScopes, [undefined, ["/tmp/direc-repository/src/feature.ts"]]);

  await pollCallback?.();
  await waitForImmediate();
  assert.deepEqual(emittedScopes, [undefined, ["/tmp/direc-repository/src/feature.ts"]]);

  watcher.close();
  assert.equal(clearCalled, true);
});
