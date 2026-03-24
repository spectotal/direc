import type { WorkflowAdapter } from "direc-workflow-runtime";
import { createDirecSnapshotEvent } from "./events.js";
import type { GitDiffPathOptions } from "./types.js";

type AnalysisEventDependencies = {
  now: () => Date;
  loadGitDiffPaths: (options: GitDiffPathOptions) => Promise<string[]>;
};

export function createLoadAnalysisEvents(
  dependencies: AnalysisEventDependencies,
): WorkflowAdapter["loadAnalysisEvents"] {
  return async function loadAnalysisEvents(options) {
    if (!options.changeFilter) {
      return [createDirecSnapshotEvent(options.repositoryRoot, dependencies.now)];
    }

    const pathScopes = await dependencies.loadGitDiffPaths({
      repositoryRoot: options.repositoryRoot,
      diffSpec: options.changeFilter,
      mode: "diff_spec",
    });

    return [
      createDirecSnapshotEvent(options.repositoryRoot, dependencies.now, {
        diffSpec: options.changeFilter,
        pathScopes,
        pathScopeMode: "strict",
      }),
    ];
  };
}
