import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  isAutomationWorkflowEvent,
  isWorkflowEventType,
  isWorkflowId,
  normalizeWorkflowId,
} from "../src/index.js";

test("normalizeWorkflowId defaults to DIREC and validates known workflows", () => {
  assert.equal(normalizeWorkflowId(undefined), WORKFLOW_IDS.DIREC);
  assert.equal(normalizeWorkflowId(WORKFLOW_IDS.OPENSPEC), WORKFLOW_IDS.OPENSPEC);
  assert.equal(isWorkflowId(WORKFLOW_IDS.DIREC), true);
  assert.equal(isWorkflowId("invalid-workflow"), false);
});

test("workflow runtime validates event types and automation events", () => {
  assert.equal(isWorkflowEventType(WORKFLOW_EVENT_TYPES.SNAPSHOT), true);
  assert.equal(isWorkflowEventType("invalid-event"), false);

  assert.equal(
    isAutomationWorkflowEvent({
      type: WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED,
      source: WORKFLOW_IDS.OPENSPEC,
      timestamp: new Date().toISOString(),
      repositoryRoot: process.cwd(),
      change: {
        id: "demo-change",
      },
    }),
    true,
  );
  assert.equal(
    isAutomationWorkflowEvent({
      type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
      source: WORKFLOW_IDS.DIREC,
      timestamp: new Date().toISOString(),
      repositoryRoot: process.cwd(),
    }),
    false,
  );
});
