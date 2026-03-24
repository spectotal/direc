import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnalyzerSnapshot, DirecConfig, DirecRuntimeState } from "./types.js";
import { readJsonFile, writeJsonFile } from "./json-files.js";

export const DIREC_DIRECTORY_NAME = ".direc";

export const DIREC_PATHS = {
  config: "config.json",
  state: "state.json",
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
  return readJsonFile(getDirecPath(repositoryRoot, DIREC_PATHS.config));
}

export async function writeDirecState(
  repositoryRoot: string,
  state: DirecRuntimeState,
): Promise<string> {
  await ensureDirecLayout(repositoryRoot);
  const path = getDirecPath(repositoryRoot, DIREC_PATHS.state);
  await writeJsonFile(path, state);
  return path;
}

export async function readDirecState(repositoryRoot: string): Promise<DirecRuntimeState | null> {
  return readJsonFile(getDirecPath(repositoryRoot, DIREC_PATHS.state));
}

export async function readLatestAnalyzerSnapshot(
  repositoryRoot: string,
  analyzerId: string,
): Promise<AnalyzerSnapshot | null> {
  return readJsonFile(
    getDirecPath(repositoryRoot, DIREC_PATHS.latest, `${sanitizeSegment(analyzerId)}.json`),
  );
}

export async function writeAnalyzerSnapshot(
  repositoryRoot: string,
  snapshot: AnalyzerSnapshot,
): Promise<{ latestPath: string; historyPath: string; scopedLatestPath?: string }> {
  await ensureDirecLayout(repositoryRoot);

  const safeAnalyzerId = sanitizeSegment(snapshot.analyzerId);
  const safeChangeId = sanitizeSegment(snapshot.event.change?.id ?? "repository");
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
