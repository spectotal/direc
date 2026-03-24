import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnalyzerSnapshot, DirecConfig, NormalizedWorkflowEvent } from "./types.js";
import { normalizeDirecConfig } from "./config-normalization.js";
import { readJsonFile, writeJsonFile } from "./json-files.js";

export const DIREC_DIRECTORY_NAME = ".direc";

export const DIREC_PATHS = {
  config: "config.json",
  latest: "latest",
  history: "history",
} as const;

export function getDirecPath(repositoryRoot: string, ...parts: string[]): string {
  return resolve(repositoryRoot, DIREC_DIRECTORY_NAME, ...parts);
}

export async function ensureDirecLayout(repositoryRoot: string): Promise<void> {
  await Promise.all([
    mkdir(getDirecPath(repositoryRoot), { recursive: true }),
    mkdir(getDirecPath(repositoryRoot, DIREC_PATHS.latest), { recursive: true }),
    mkdir(getDirecPath(repositoryRoot, DIREC_PATHS.history), { recursive: true }),
  ]);
}

export async function writeDirecConfig(
  repositoryRoot: string,
  config: DirecConfig,
): Promise<string> {
  await ensureDirecLayout(repositoryRoot);
  const path = getDirecPath(repositoryRoot, DIREC_PATHS.config);
  await writeJsonFile(path, config);
  return path;
}

export async function readDirecConfig(repositoryRoot: string): Promise<DirecConfig | null> {
  const config = await readJsonFile<Record<string, unknown>>(
    getDirecPath(repositoryRoot, DIREC_PATHS.config),
  );

  if (!config) {
    return null;
  }

  return normalizeDirecConfig(config);
}

export async function readLatestAnalyzerSnapshot(
  repositoryRoot: string,
  analyzerId: string,
  scopeId?: string,
): Promise<AnalyzerSnapshot | null> {
  const safeAnalyzerId = sanitizeSegment(analyzerId);

  if (scopeId) {
    return readJsonFile(
      getDirecPath(
        repositoryRoot,
        DIREC_PATHS.latest,
        sanitizeSegment(scopeId),
        `${safeAnalyzerId}.json`,
      ),
    );
  }

  return readJsonFile(getDirecPath(repositoryRoot, DIREC_PATHS.latest, `${safeAnalyzerId}.json`));
}

export async function writeAnalyzerSnapshot(
  repositoryRoot: string,
  snapshot: AnalyzerSnapshot,
): Promise<{ latestPath: string; historyPath: string; scopedLatestPath?: string }> {
  await ensureDirecLayout(repositoryRoot);

  const safeAnalyzerId = sanitizeSegment(snapshot.analyzerId);
  const safeChangeId = sanitizeSegment(getEventScopeId(snapshot.event));
  const safeTimestamp = sanitizeSegment(snapshot.timestamp);

  const latestPath = getDirecPath(repositoryRoot, DIREC_PATHS.latest, `${safeAnalyzerId}.json`);
  const scopedLatestPath = getDirecPath(
    repositoryRoot,
    DIREC_PATHS.latest,
    safeChangeId,
    `${safeAnalyzerId}.json`,
  );
  const historyPath = getDirecPath(
    repositoryRoot,
    DIREC_PATHS.history,
    safeChangeId,
    `${safeTimestamp}-${safeAnalyzerId}.json`,
  );

  await Promise.all([
    writeJsonFile(latestPath, snapshot),
    writeJsonFile(scopedLatestPath, snapshot),
    writeJsonFile(historyPath, snapshot),
  ]);

  return {
    latestPath,
    historyPath,
    scopedLatestPath,
  };
}

function sanitizeSegment(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "_");
}

export function getEventScopeId(event: NormalizedWorkflowEvent): string {
  if (event.change?.id) {
    return event.change.id;
  }

  if (
    event.pathScopeMode === "strict" &&
    typeof event.metadata?.diffSpec === "string" &&
    event.metadata.diffSpec.length > 0
  ) {
    return `${event.source}-diff-${event.metadata.diffSpec}`;
  }

  return "repository";
}
