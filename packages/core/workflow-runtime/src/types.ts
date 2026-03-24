import type { NormalizedWorkflowEvent } from "./events.js";
import type { WorkflowId } from "./workflows.js";

export type {
  ArtifactTransitionWorkflowEvent,
  AutomationWorkflowEvent,
  ChangeCompletedWorkflowEvent,
  ChangeCreatedWorkflowEvent,
  ChangeRemovedWorkflowEvent,
  NormalizedWorkflowEvent,
  SnapshotWorkflowEvent,
  WorkflowArtifactRef,
  WorkflowChangeRef,
  WorkflowEventBase,
  WorkflowEventType,
  WorkflowPathScopeMode,
  WorkflowWorkItemRef,
  WorkItemTransitionWorkflowEvent,
} from "./events.js";

export interface WorkflowLoadEventsOptions {
  repositoryRoot: string;
  changeFilter?: string;
  includeWorkItemTransitions?: boolean;
}

export interface WorkflowWatchEventsOptions extends WorkflowLoadEventsOptions {
  onEvent: (event: NormalizedWorkflowEvent) => void;
}

export interface WorkflowAdapter {
  id: WorkflowId;
  displayName: string;
  supportsAutomation: boolean;
  loadAnalysisEvents(options: WorkflowLoadEventsOptions): Promise<NormalizedWorkflowEvent[]>;
  watchEvents(options: WorkflowWatchEventsOptions): Promise<{ close: () => void }>;
}
