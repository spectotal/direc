import { resolve } from "node:path";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type NormalizedWorkflowEvent,
} from "@spectotal/direc-workflow-runtime";
import type { OpenSpecChangeStatus } from "./types.js";
import { getStatusRevision } from "./status-revision.js";

export function createTaskTransitionEvents(options: {
  changeName: string;
  previousStatus: OpenSpecChangeStatus;
  status: OpenSpecChangeStatus;
  projectRoot: string;
  repositoryRoot: string;
  timestamp: string;
}): NormalizedWorkflowEvent[] {
  const previousTasks = options.previousStatus.tasks ?? [];
  const currentTasks = options.status.tasks ?? [];
  const previousById = new Map(previousTasks.map((task) => [task.id, task]));
  const events: NormalizedWorkflowEvent[] = [];

  for (const task of currentTasks) {
    const previousTask = previousById.get(task.id);
    if (!previousTask || previousTask.checked === task.checked) {
      continue;
    }

    events.push({
      type: WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION,
      source: WORKFLOW_IDS.OPENSPEC,
      timestamp: options.timestamp,
      repositoryRoot: options.repositoryRoot,
      change: {
        id: options.changeName,
        schema: options.status.schemaName,
        revision: getStatusRevision(options.status),
      },
      workItem: {
        id: task.id,
        title: task.title,
        sourcePath: task.sourcePath,
        fromState: previousTask.checked ? "done" : "pending",
        toState: task.checked ? "done" : "pending",
      },
      pathScopes: [task.sourcePath],
      metadata: {
        changeDir: resolve(options.projectRoot, "openspec", "changes", options.changeName),
      },
    });
  }

  return events;
}

export function createChangeCreatedEvent(options: {
  changeName: string;
  status: OpenSpecChangeStatus;
  projectRoot: string;
  repositoryRoot: string;
  timestamp: string;
}): NormalizedWorkflowEvent {
  return {
    type: WORKFLOW_EVENT_TYPES.CHANGE_CREATED,
    source: WORKFLOW_IDS.OPENSPEC,
    timestamp: options.timestamp,
    repositoryRoot: options.repositoryRoot,
    change: {
      id: options.changeName,
      schema: options.status.schemaName,
      revision: getStatusRevision(options.status),
    },
    pathScopes: options.status.artifacts.map((artifact) =>
      resolve(options.projectRoot, "openspec", "changes", options.changeName, artifact.outputPath),
    ),
    metadata: {
      artifacts: options.status.artifacts,
    },
  };
}

export function createTransitionEvents(options: {
  changeName: string;
  previousStatus: OpenSpecChangeStatus;
  status: OpenSpecChangeStatus;
  projectRoot: string;
  repositoryRoot: string;
  timestamp: string;
}): NormalizedWorkflowEvent[] {
  const previousArtifacts = new Map(
    options.previousStatus.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  const events: NormalizedWorkflowEvent[] = [];

  for (const artifact of options.status.artifacts) {
    const previousArtifact = previousArtifacts.get(artifact.id);
    if (!previousArtifact || previousArtifact.status === artifact.status) {
      continue;
    }

    events.push({
      type: WORKFLOW_EVENT_TYPES.TRANSITION,
      source: WORKFLOW_IDS.OPENSPEC,
      timestamp: options.timestamp,
      repositoryRoot: options.repositoryRoot,
      change: {
        id: options.changeName,
        schema: options.status.schemaName,
        revision: getStatusRevision(options.status),
      },
      artifact: {
        id: artifact.id,
        outputPath: artifact.outputPath,
        fromStatus: previousArtifact.status,
        toStatus: artifact.status,
      },
      pathScopes: [
        resolve(
          options.projectRoot,
          "openspec",
          "changes",
          options.changeName,
          artifact.outputPath,
        ),
      ],
      metadata: {
        progress: {
          done: options.status.artifacts.filter((entry) => entry.status === "done").length,
          total: options.status.artifacts.length,
        },
      },
    });
  }

  return events;
}
