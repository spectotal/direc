import { join } from "node:path";
import type { LatestRunRecord, SinkDeliveryBundle, WorkspaceConfig } from "../index.js";
import { ensureDirectory, readJsonFileOrNull, writeJsonFile } from "./json-io.js";
import { sanitiseSegment } from "./persistence.js";

const DIREC_DIR = ".direc";

export async function ensureDirecLayout(repositoryRoot: string): Promise<void> {
  await Promise.all([
    ensureDirectory(join(repositoryRoot, DIREC_DIR)),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "runs")),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "latest")),
    ensureDirectory(join(repositoryRoot, DIREC_DIR, "cache")),
  ]);
}

export async function writeWorkspaceConfig(
  repositoryRoot: string,
  config: WorkspaceConfig,
): Promise<string> {
  await ensureDirecLayout(repositoryRoot);
  const configPath = join(repositoryRoot, DIREC_DIR, "config.json");
  await writeJsonFile(configPath, config);
  return configPath;
}

export async function readWorkspaceConfig(repositoryRoot: string): Promise<WorkspaceConfig> {
  return (await readJsonFileOrNull<WorkspaceConfig>(
    join(repositoryRoot, DIREC_DIR, "config.json"),
  )) as WorkspaceConfig;
}

export async function readLatestRunRecord(
  repositoryRoot: string,
  pipelineId: string,
): Promise<LatestRunRecord | null> {
  return readJsonFileOrNull<LatestRunRecord>(
    join(repositoryRoot, DIREC_DIR, "latest", sanitiseSegment(pipelineId), "manifest.json"),
  );
}

export async function readLatestSinkDelivery(
  repositoryRoot: string,
  pipelineId: string,
  sinkId: string,
): Promise<SinkDeliveryBundle | null> {
  const latestRecord = await readLatestRunRecord(repositoryRoot, pipelineId);
  const outputPath = latestRecord?.deliveries.find(
    (delivery) => delivery.sinkId === sinkId,
  )?.outputPath;

  if (!outputPath) {
    return null;
  }

  return readJsonFileOrNull<SinkDeliveryBundle>(
    join(repositoryRoot, DIREC_DIR, "latest", sanitiseSegment(pipelineId), outputPath),
  );
}
