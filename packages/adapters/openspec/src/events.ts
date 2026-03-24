import { resolve } from "node:path";
import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_IDS,
  type NormalizedWorkflowEvent,
} from "@spectotal/direc-workflow-runtime";
import {
  createChangeCreatedEvent,
  createTaskTransitionEvents,
  createTransitionEvents,
} from "./event-transitions.js";
import { getStatusRevision } from "./status-revision.js";
import type { OpenSpecSnapshot } from "./types.js";

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
        createChangeCreatedEvent({
          changeName,
          status,
          projectRoot,
          repositoryRoot,
          timestamp,
        }),
      );
      continue;
    }

    events.push(
      ...createTransitionEvents({
        changeName,
        previousStatus,
        status,
        projectRoot,
        repositoryRoot,
        timestamp,
      }),
    );

    events.push(
      ...createTaskTransitionEvents({
        changeName,
        previousStatus,
        status,
        projectRoot,
        repositoryRoot,
        timestamp,
      }),
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

export { getStatusRevision };
