import { resolve } from "node:path";
import type { NormalizedWorkflowEvent } from "direc-analysis-runtime";
import type { OpenSpecChangeStatus, OpenSpecSnapshot } from "./types.js";

export function normalizeOpenSpecSnapshot(
  snapshot: OpenSpecSnapshot,
  projectRoot: string,
): NormalizedWorkflowEvent[] {
  const timestamp = new Date().toISOString();

  return [...snapshot.entries()].map(([changeName, status]) => ({
    type: "snapshot",
    source: "openspec",
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

    if (!previousStatus.isComplete && status.isComplete) {
      events.push({
        type: "change_completed",
        source: "openspec",
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
      type: "change_removed",
      source: "openspec",
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
    type: "change_created",
    source: "openspec",
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
      type: "transition",
      source: "openspec",
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
