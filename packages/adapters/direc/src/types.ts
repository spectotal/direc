import type { WorkflowPathScopeMode } from "direc-workflow-runtime";

export type GitDiffMode = "diff_spec" | "working_tree";

export type GitDiffPathOptions = {
  repositoryRoot: string;
  diffSpec?: string;
  mode: GitDiffMode;
};

export type DirecSnapshotEventOptions = {
  diffSpec?: string;
  pathScopes?: string[];
  pathScopeMode?: WorkflowPathScopeMode;
};

export type DirecWorkflowFactoryOptions = {
  now?: () => Date;
  loadGitDiffPaths?: (options: GitDiffPathOptions) => Promise<string[]>;
  setPollInterval?: (callback: () => void | Promise<void>, intervalMs: number) => NodeJS.Timeout;
  clearPollInterval?: (timer: NodeJS.Timeout | undefined) => void;
  pollIntervalMs?: number;
};
