import type { NormalizedWorkflowEvent, WorkflowAdapter } from "@spectotal/direc-workflow-runtime";
import { createDirecSnapshotEvent } from "./events.js";
import type { GitDiffMode, GitDiffPathOptions } from "./types.js";

type WatchDependencies = {
  now: () => Date;
  loadGitDiffPaths: (options: GitDiffPathOptions) => Promise<string[]>;
  pollIntervalMs: number;
  setPollInterval: (callback: () => void | Promise<void>, intervalMs: number) => NodeJS.Timeout;
  clearPollInterval: (timer: NodeJS.Timeout | undefined) => void;
};

type WatchState = {
  dependencies: WatchDependencies;
  options: Parameters<NonNullable<WorkflowAdapter["watchEvents"]>>[0];
  diffSpec: string;
  mode: GitDiffMode;
  previousSignature: string;
};

export function createWatchEvents(dependencies: WatchDependencies): WorkflowAdapter["watchEvents"] {
  return async function watchEvents(options) {
    const state = createWatchState(dependencies, options);
    await emitIfChanged(state, true);

    const timer = dependencies.setPollInterval(pollForChanges(state), dependencies.pollIntervalMs);

    return {
      close: () => {
        dependencies.clearPollInterval(timer);
      },
    };
  };
}

function createWatchState(
  dependencies: WatchDependencies,
  options: Parameters<NonNullable<WorkflowAdapter["watchEvents"]>>[0],
): WatchState {
  const diffSpec = options.changeFilter ? options.changeFilter : "HEAD";
  const mode: GitDiffMode = options.changeFilter ? "diff_spec" : "working_tree";

  return {
    dependencies,
    options,
    diffSpec,
    mode,
    previousSignature: "",
  };
}

function pollForChanges(state: WatchState): () => void {
  return () => {
    void emitIfChanged(state, false);
  };
}

async function emitIfChanged(state: WatchState, force: boolean): Promise<void> {
  const event = await loadCurrentEvent(state);
  const signature = createEventSignature(event);

  if (!force && signature === state.previousSignature) {
    return;
  }

  state.previousSignature = signature;
  state.options.onEvent(event);
}

async function loadCurrentEvent(state: WatchState): Promise<NormalizedWorkflowEvent> {
  const pathScopes = await state.dependencies.loadGitDiffPaths({
    repositoryRoot: state.options.repositoryRoot,
    diffSpec: state.diffSpec,
    mode: state.mode,
  });

  return createDirecSnapshotEvent(state.options.repositoryRoot, state.dependencies.now, {
    diffSpec: state.diffSpec,
    pathScopes,
    pathScopeMode: "strict",
  });
}

function createEventSignature(event: NormalizedWorkflowEvent): string {
  return [event.pathScopeMode ? event.pathScopeMode : "fallback", ...(event.pathScopes ?? [])].join(
    "\0",
  );
}
