import { WORKFLOW_IDS, type WorkflowAdapter } from "@spectotal/direc-workflow-runtime";
import { normalizeOpenSpecSnapshot } from "./events.js";
import { takeOpenSpecSnapshot } from "./status.js";
import { watchOpenSpecChanges } from "./watch.js";

export const openSpecWorkflowAdapter: WorkflowAdapter = {
  id: WORKFLOW_IDS.OPENSPEC,
  displayName: "OpenSpec",
  supportsAutomation: true,
  async loadAnalysisEvents(options) {
    const snapshot = await takeOpenSpecSnapshot({
      projectRoot: options.repositoryRoot,
      changeFilter: options.changeFilter,
      taskDiffs: options.includeWorkItemTransitions,
    });

    return normalizeOpenSpecSnapshot(snapshot, options.repositoryRoot);
  },
  watchEvents(options) {
    return watchOpenSpecChanges({
      projectRoot: options.repositoryRoot,
      changeFilter: options.changeFilter,
      taskDiffs: options.includeWorkItemTransitions,
      onEvent: options.onEvent,
    });
  },
};
