import type { WorkflowAdapter } from "@spectotal/direc-workflow-runtime";
import { WORKFLOW_IDS } from "@spectotal/direc-workflow-runtime";
import { createLoadAnalysisEvents } from "./analysis-events.js";
import { getGitDiffPaths } from "./git.js";
import type { DirecWorkflowFactoryOptions } from "./types.js";
import { createWatchEvents } from "./watch-events.js";

export function createDirecWorkflowAdapter(
  factoryOptions: DirecWorkflowFactoryOptions = {},
): WorkflowAdapter {
  const loadGitDiffPaths = factoryOptions.loadGitDiffPaths ?? getGitDiffPaths;
  const now = factoryOptions.now ?? (() => new Date());
  const setPollInterval =
    factoryOptions.setPollInterval ?? ((callback, intervalMs) => setInterval(callback, intervalMs));
  const clearPollInterval = factoryOptions.clearPollInterval ?? clearInterval;
  const loadAnalysisEvents = createLoadAnalysisEvents({
    now,
    loadGitDiffPaths,
  });
  const watchEvents = createWatchEvents({
    now,
    loadGitDiffPaths,
    pollIntervalMs: factoryOptions.pollIntervalMs ?? 1000,
    setPollInterval,
    clearPollInterval,
  });

  return {
    id: WORKFLOW_IDS.DIREC,
    displayName: "DIREC",
    supportsAutomation: true,
    loadAnalysisEvents,
    watchEvents,
  };
}

export const direcWorkflowAdapter = createDirecWorkflowAdapter();
