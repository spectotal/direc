import { WORKFLOW_EVENT_TYPES } from "@spectotal/direc-workflow-runtime";
import type { DispatchAutomationEventOptions } from "../types.js";

export function shouldDispatchAutomationEvent(
  profile: DispatchAutomationEventOptions["profile"],
  event: DispatchAutomationEventOptions["event"],
): boolean {
  switch (event.type) {
    case WORKFLOW_EVENT_TYPES.SNAPSHOT:
      return profile.triggers.snapshotEvents;
    case WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION:
      return profile.triggers.workItemTransitions;
    case WORKFLOW_EVENT_TYPES.TRANSITION:
      return profile.triggers.artifactTransitions;
    case WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED:
      return profile.triggers.changeCompleted;
    default:
      return false;
  }
}
