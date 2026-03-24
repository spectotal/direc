import type { NormalizedWorkflowEvent } from "direc-analysis-runtime";

export interface OpenSpecArtifactStatus {
  id: string;
  outputPath: string;
  status: string;
}

export interface OpenSpecChangeStatus {
  changeName: string;
  schemaName: string;
  isComplete: boolean;
  artifacts: OpenSpecArtifactStatus[];
}

export type OpenSpecSnapshot = Map<string, OpenSpecChangeStatus>;

export type SnapshotOptions = {
  projectRoot: string;
  changeFilter?: string;
  listChanges?: (projectRoot: string, changeFilter?: string) => Promise<string[]>;
  loadStatus?: (projectRoot: string, changeName: string) => Promise<OpenSpecChangeStatus | null>;
};

export type WatchOptions = SnapshotOptions & {
  debounceMs?: number;
  onEvent: (event: NormalizedWorkflowEvent) => void;
  watchFactory?: (
    path: string,
    listener: () => void,
  ) => {
    close: () => void;
  };
  setDebounceTimer?: (callback: () => void | Promise<void>, delayMs: number) => NodeJS.Timeout;
  clearDebounceTimer?: (timer: NodeJS.Timeout | undefined) => void;
};
