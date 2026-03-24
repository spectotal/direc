export const WORKFLOW_IDS = {
  DIREC: "direc",
  OPENSPEC: "openspec",
} as const;

export type WorkflowId = (typeof WORKFLOW_IDS)[keyof typeof WORKFLOW_IDS];

const WORKFLOW_ID_SET = new Set<WorkflowId>(Object.values(WORKFLOW_IDS));

export function isWorkflowId(value: unknown): value is WorkflowId {
  return typeof value === "string" && WORKFLOW_ID_SET.has(value as WorkflowId);
}

export function normalizeWorkflowId(value: unknown): WorkflowId {
  return isWorkflowId(value) ? value : WORKFLOW_IDS.DIREC;
}
