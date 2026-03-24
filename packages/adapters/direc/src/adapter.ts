import type { NormalizedWorkflowEvent, WorkflowAdapter } from "direc-workflow-runtime";
import { WORKFLOW_IDS } from "direc-workflow-runtime";
import { createDirecSnapshotEvent } from "./events.js";
import { getGitDiffPaths } from "./git.js";
import type { DirecWorkflowFactoryOptions, GitDiffMode } from "./types.js";

export function createDirecWorkflowAdapter(
  factoryOptions: DirecWorkflowFactoryOptions = {},
): WorkflowAdapter {
  const loadGitDiffPaths = factoryOptions.loadGitDiffPaths ?? getGitDiffPaths;
  const now = factoryOptions.now ?? (() => new Date());
  const setPollInterval =
    factoryOptions.setPollInterval ?? ((callback, intervalMs) => setInterval(callback, intervalMs));
  const clearPollInterval = factoryOptions.clearPollInterval ?? clearInterval;

  return {
    id: WORKFLOW_IDS.DIREC,
    displayName: "DIREC",
    supportsAutomation: false,
    async loadAnalysisEvents(options) {
      if (!options.changeFilter) {
        return [createDirecSnapshotEvent(options.repositoryRoot, now)];
      }

      const pathScopes = await loadGitDiffPaths({
        repositoryRoot: options.repositoryRoot,
        diffSpec: options.changeFilter,
        mode: "diff_spec",
      });

      return [
        createDirecSnapshotEvent(options.repositoryRoot, now, {
          diffSpec: options.changeFilter,
          pathScopes,
          pathScopeMode: "strict",
        }),
      ];
    },
    async watchEvents(options) {
      const mode: GitDiffMode = options.changeFilter ? "diff_spec" : "working_tree";
      const diffSpec = options.changeFilter ?? "HEAD";
      const loadCurrentEvent = async (): Promise<NormalizedWorkflowEvent> =>
        createDirecSnapshotEvent(options.repositoryRoot, now, {
          diffSpec,
          pathScopes: await loadGitDiffPaths({
            repositoryRoot: options.repositoryRoot,
            diffSpec,
            mode,
          }),
          pathScopeMode: "strict",
        });

      let previousSignature = "";
      const emitIfChanged = async (force = false): Promise<void> => {
        const event = await loadCurrentEvent();
        const signature = [event.pathScopeMode ?? "fallback", ...(event.pathScopes ?? [])].join(
          "\0",
        );

        if (!force && signature === previousSignature) {
          return;
        }

        previousSignature = signature;
        options.onEvent(event);
      };

      await emitIfChanged(true);

      const timer = setPollInterval(() => {
        void emitIfChanged(false);
      }, factoryOptions.pollIntervalMs ?? 1000);

      return {
        close: () => {
          clearPollInterval(timer);
        },
      };
    },
  };
}

export const direcWorkflowAdapter = createDirecWorkflowAdapter();
