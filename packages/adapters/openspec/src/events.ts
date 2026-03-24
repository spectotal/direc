import { resolve } from "node:path";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type NormalizedWorkflowEvent,
} from "direc-workflow-runtime";
import type { OpenSpecChangeStatus, OpenSpecSnapshot } from "./types.js";

export function normalizeOpenSpecSnapshot(
  snapshot: OpenSpecSnapshot,
  projectRoot: string,
): NormalizedWorkflowEvent[] {
  const timestamp = new Date().toISOString();

  return [...snapshot.entries()].map(([changeName, status]) => ({
    type: WORKFLOW_EVENT_TYPES.SNAPSHOT,
    source: WORKFLOW_IDS.OPENSPEC,
    timestamp,
    repositoryRoot: resolve(projectRoot),
    change: {
      id: changeName,
      schema: status.schemaName,
      revision: getStatusRevision(status),
    },
    pathScopes: status.artifacts.map((artifact) =>
      resolve(projectRoot, "openspec", "changes", changeName, artifact.outputPath),
    ),
    metadata: {
      artifacts: status.artifacts,
      isComplete: status.isComplete,
    },
  }));
}

export function diffOpenSpecSnapshots(
  previous: OpenSpecSnapshot,
  current: OpenSpecSnapshot,
  projectRoot: string,
): NormalizedWorkflowEvent[] {
  const events: NormalizedWorkflowEvent[] = [];
  const repositoryRoot = resolve(projectRoot);
  const timestamp = new Date().toISOString();

  for (const [changeName, status] of current) {
    const previousStatus = previous.get(changeName);
    if (!previousStatus) {
      events.push(
        createChangeCreatedEvent(changeName, status, projectRoot, repositoryRoot, timestamp),
      );
      continue;
    }

    events.push(
      ...createTransitionEvents(
        changeName,
        previousStatus,
        status,
        projectRoot,
        repositoryRoot,
        timestamp,
      ),
    );

    events.push(
      ...createTaskTransitionEvents(
        changeName,
        previousStatus,
        status,
        projectRoot,
        repositoryRoot,
        timestamp,
      ),
    );

    if (!previousStatus.isComplete && status.isComplete) {
      events.push({
        type: WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED,
        source: WORKFLOW_IDS.OPENSPEC,
        timestamp,
        repositoryRoot,
        change: {
          id: changeName,
          schema: status.schemaName,
          revision: getStatusRevision(status),
        },
        pathScopes: status.artifacts.map((artifact) =>
          resolve(projectRoot, "openspec", "changes", changeName, artifact.outputPath),
        ),
      });
    }
  }

  for (const [changeName, status] of previous) {
    if (current.has(changeName)) {
      continue;
    }

    events.push({
      type: WORKFLOW_EVENT_TYPES.CHANGE_REMOVED,
      source: WORKFLOW_IDS.OPENSPEC,
      timestamp,
      repositoryRoot,
      change: {
        id: changeName,
        schema: status.schemaName,
        revision: getStatusRevision(status),
      },
    });
  }

  return events;
}

function createTaskTransitionEvents(
  changeName: string,
  previousStatus: OpenSpecChangeStatus,
  status: OpenSpecChangeStatus,
  projectRoot: string,
  repositoryRoot: string,
  timestamp: string,
): NormalizedWorkflowEvent[] {
  const previousTasks = previousStatus.tasks ?? [];
  const currentTasks = status.tasks ?? [];
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
      timestamp,
      repositoryRoot,
      change: {
        id: changeName,
        schema: status.schemaName,
        revision: getStatusRevision(status),
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
        changeDir: resolve(projectRoot, "openspec", "changes", changeName),
      },
    });
  }

  return events;
}

export function getStatusRevision(status: OpenSpecChangeStatus): string {
  return status.artifacts
    .map((artifact) => `${artifact.id}:${artifact.status}`)
    .sort()
    .join("|");
}

function createChangeCreatedEvent(
  changeName: string,
  status: OpenSpecChangeStatus,
  projectRoot: string,
  repositoryRoot: string,
  timestamp: string,
): NormalizedWorkflowEvent {
  return {
    type: WORKFLOW_EVENT_TYPES.CHANGE_CREATED,
    source: WORKFLOW_IDS.OPENSPEC,
    timestamp,
    repositoryRoot,
    change: {
      id: changeName,
      schema: status.schemaName,
      revision: getStatusRevision(status),
    },
    pathScopes: status.artifacts.map((artifact) =>
      resolve(projectRoot, "openspec", "changes", changeName, artifact.outputPath),
    ),
    metadata: {
      artifacts: status.artifacts,
    },
  };
}

function createTransitionEvents(
  changeName: string,
  previousStatus: OpenSpecChangeStatus,
  status: OpenSpecChangeStatus,
  projectRoot: string,
  repositoryRoot: string,
  timestamp: string,
): NormalizedWorkflowEvent[] {
  const previousArtifacts = new Map(
    previousStatus.artifacts.map((artifact) => [artifact.id, artifact]),
  );
  const events: NormalizedWorkflowEvent[] = [];

  for (const artifact of status.artifacts) {
    const previousArtifact = previousArtifacts.get(artifact.id);
    if (!previousArtifact || previousArtifact.status === artifact.status) {
      continue;
    }

    events.push({
      type: WORKFLOW_EVENT_TYPES.TRANSITION,
      source: WORKFLOW_IDS.OPENSPEC,
      timestamp,
      repositoryRoot,
      change: {
        id: changeName,
        schema: status.schemaName,
        revision: getStatusRevision(status),
      },
      artifact: {
        id: artifact.id,
        outputPath: artifact.outputPath,
        fromStatus: previousArtifact.status,
        toStatus: artifact.status,
      },
      pathScopes: [resolve(projectRoot, "openspec", "changes", changeName, artifact.outputPath)],
      metadata: {
        progress: {
          done: status.artifacts.filter((entry) => entry.status === "done").length,
          total: status.artifacts.length,
        },
      },
    });
  }

  return events;
}
