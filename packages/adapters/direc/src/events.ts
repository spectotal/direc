import { resolve } from "node:path";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type NormalizedWorkflowEvent,
} from "@spectotal/direc-workflow-runtime";
import type { DirecSnapshotEventOptions } from "./types.js";

export function createDirecSnapshotEvent(
  repositoryRoot: string,
  now: () => Date,
  options: DirecSnapshotEventOptions = {},
): NormalizedWorkflowEvent {
  return {
    type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
    source: WORKFLOW_IDS.DIREC,
    timestamp: now().toISOString(),
    repositoryRoot: resolve(repositoryRoot),
    ...(options.pathScopes && options.pathScopes.length > 0
      ? { pathScopes: options.pathScopes }
      : {}),
    ...(options.pathScopeMode ? { pathScopeMode: options.pathScopeMode } : {}),
    metadata: {
      ...(options.diffSpec ? { diffSpec: options.diffSpec } : {}),
      ...(options.pathScopeMode === "strict" ? { scope: "git-diff" } : { scope: "repository" }),
    },
  };
}
