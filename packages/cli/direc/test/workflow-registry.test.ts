import assert from "node:assert/strict";
import test from "node:test";
import { WORKFLOW_IDS } from "direc-workflow-runtime";
import { resolveRequestedWorkflowId, resolveWorkflowAdapter } from "../src/registry/workflows.js";

test("resolveRequestedWorkflowId defaults to DIREC and rejects unsupported workflows", () => {
  assert.equal(resolveRequestedWorkflowId(undefined), WORKFLOW_IDS.DIREC);
  assert.equal(resolveRequestedWorkflowId(WORKFLOW_IDS.OPENSPEC), WORKFLOW_IDS.OPENSPEC);
  assert.throws(
    () => resolveRequestedWorkflowId("invalid-workflow"),
    /Unsupported workflow: invalid-workflow/,
  );
});

test("resolveWorkflowAdapter returns the registered workflow adapters", () => {
  const openSpecAdapter = resolveWorkflowAdapter(WORKFLOW_IDS.OPENSPEC);
  const direcAdapter = resolveWorkflowAdapter(WORKFLOW_IDS.DIREC);

  assert.equal(openSpecAdapter.id, WORKFLOW_IDS.OPENSPEC);
  assert.equal(openSpecAdapter.supportsAutomation, true);
  assert.equal(direcAdapter.id, WORKFLOW_IDS.DIREC);
  assert.equal(direcAdapter.supportsAutomation, false);
});
