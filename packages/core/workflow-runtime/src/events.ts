import type { WorkflowId } from "./workflows.js";

export const WORKFLOW_EVENT_TYPES = {
  SNAPSHOT: "snapshot",
  TRANSITION: "transition",
  WORK_ITEM_TRANSITION: "work_item_transition",
  CHANGE_COMPLETED: "change_completed",
  CHANGE_CREATED: "change_created",
  CHANGE_REMOVED: "change_removed",
} as const;

export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[keyof typeof WORKFLOW_EVENT_TYPES];

const WORKFLOW_EVENT_TYPE_SET = new Set<WorkflowEventType>(Object.values(WORKFLOW_EVENT_TYPES));

export function isWorkflowEventType(value: unknown): value is WorkflowEventType {
  return typeof value === "string" && WORKFLOW_EVENT_TYPE_SET.has(value as WorkflowEventType);
}

export type WorkflowPathScopeMode = "fallback" | "strict";

export interface WorkflowChangeRef {
  id: string;
  schema?: string;
  revision?: string | null;
}

export interface WorkflowArtifactRef {
  id: string;
  outputPath?: string;
  fromStatus?: string;
  toStatus?: string;
}

export interface WorkflowWorkItemRef {
  id: string;
  title: string;
  sourcePath: string;
  fromState?: string;
  toState?: string;
}

export interface WorkflowEventBase<TType extends WorkflowEventType = WorkflowEventType> {
  type: TType;
  source: WorkflowId;
  timestamp: string;
  repositoryRoot: string;
  change?: WorkflowChangeRef;
  artifact?: WorkflowArtifactRef;
  workItem?: WorkflowWorkItemRef;
  pathScopes?: string[];
  pathScopeMode?: WorkflowPathScopeMode;
  metadata?: Record<string, unknown>;
}

export type SnapshotWorkflowEvent = WorkflowEventBase<typeof WORKFLOW_EVENT_TYPES.SNAPSHOT>;

export interface ArtifactTransitionWorkflowEvent extends WorkflowEventBase<
  typeof WORKFLOW_EVENT_TYPES.TRANSITION
> {
  change: WorkflowChangeRef;
  artifact: WorkflowArtifactRef;
}

export interface WorkItemTransitionWorkflowEvent extends WorkflowEventBase<
  typeof WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION
> {
  change: WorkflowChangeRef;
  workItem: WorkflowWorkItemRef;
}

export interface ChangeCompletedWorkflowEvent extends WorkflowEventBase<
  typeof WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED
> {
  change: WorkflowChangeRef;
}

export interface ChangeCreatedWorkflowEvent extends WorkflowEventBase<
  typeof WORKFLOW_EVENT_TYPES.CHANGE_CREATED
> {
  change: WorkflowChangeRef;
}

export interface ChangeRemovedWorkflowEvent extends WorkflowEventBase<
  typeof WORKFLOW_EVENT_TYPES.CHANGE_REMOVED
> {
  change: WorkflowChangeRef;
}

export type NormalizedWorkflowEvent =
  | SnapshotWorkflowEvent
  | ArtifactTransitionWorkflowEvent
  | WorkItemTransitionWorkflowEvent
  | ChangeCompletedWorkflowEvent
  | ChangeCreatedWorkflowEvent
  | ChangeRemovedWorkflowEvent;

export type AutomationWorkflowEvent =
  | SnapshotWorkflowEvent
  | ArtifactTransitionWorkflowEvent
  | WorkItemTransitionWorkflowEvent
  | ChangeCompletedWorkflowEvent;

export function isAutomationWorkflowEvent(
  event: NormalizedWorkflowEvent,
): event is AutomationWorkflowEvent {
  return (
    event.type === WORKFLOW_EVENT_TYPES.SNAPSHOT ||
    event.type === WORKFLOW_EVENT_TYPES.TRANSITION ||
    event.type === WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION ||
    event.type === WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED
  );
}
