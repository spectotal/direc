import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { ArtifactEnvelope, ArtifactSeed } from "@spectotal/direc-artifact-contracts";
import type { RunManifest } from "../index.js";
import { writeJsonFile } from "./json-io.js";

export async function persistArtifactSeeds(options: {
  runId: string;
  pipelineId: string;
  sourceId: string;
  producerId: string;
  seeds: ArtifactSeed[];
  inputArtifactIds: string[];
  now: () => Date;
}): Promise<ArtifactEnvelope[]> {
  const persisted: ArtifactEnvelope[] = [];

  for (const seed of options.seeds) {
    persisted.push({
      id: `${sanitiseSegment(seed.type)}-${randomUUID()}`,
      type: seed.type,
      producerId: options.producerId,
      runId: options.runId,
      pipelineId: options.pipelineId,
      sourceId: options.sourceId,
      scope: seed.scope,
      inputArtifactIds: options.inputArtifactIds,
      timestamp: options.now().toISOString(),
      payload: seed.payload,
      metadata: seed.metadata,
    });
  }

  return persisted;
}

export async function writePersistedSnapshot(options: {
  directory: string;
  manifest: RunManifest;
}): Promise<void> {
  await writeJsonFile(join(options.directory, "manifest.json"), options.manifest);
}

export function createRunId(now: () => Date): string {
  return `${now().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID()}`;
}

export function sanitiseSegment(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "_");
}

export function mapById<T extends { id: string }>(entries: T[]): Map<string, T> {
  const map = new Map<string, T>();

  for (const entry of entries) {
    map.set(entry.id, entry);
  }

  return map;
}
