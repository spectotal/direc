import {
  WORKFLOW_IDS,
  isWorkflowId,
  type WorkflowAdapter,
  type WorkflowId,
} from "@spectotal/direc-workflow-runtime";
import { direcWorkflowAdapter } from "@spectotal/direc-adapter-direc";
import { openSpecWorkflowAdapter } from "@spectotal/direc-adapter-openspec";

const registry = new Map<WorkflowId, WorkflowAdapter>([
  [WORKFLOW_IDS.DIREC, direcWorkflowAdapter],
  [WORKFLOW_IDS.OPENSPEC, openSpecWorkflowAdapter],
]);

export function resolveRequestedWorkflowId(
  value: string | undefined,
  fallback: WorkflowId = WORKFLOW_IDS.DIREC,
): WorkflowId {
  if (typeof value === "undefined") {
    return fallback;
  }

  if (!isWorkflowId(value)) {
    throw new Error(`Unsupported workflow: ${value}`);
  }

  return value;
}

export function resolveWorkflowAdapter(workflowId: WorkflowId): WorkflowAdapter {
  const adapter = registry.get(workflowId);

  if (!adapter) {
    throw new Error(`No workflow adapter is registered for ${workflowId}.`);
  }

  return adapter;
}
