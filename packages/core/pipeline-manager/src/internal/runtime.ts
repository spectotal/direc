import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineRunResult, RunPipelineOptions, WatchPipelineOptions } from "../index.js";
import { planPipelineExecution } from "./planning.js";
import { createRunId, sanitiseSegment, writePersistedSnapshot } from "./persistence.js";
import { collectArtifacts, createManifest, deliverArtifacts } from "./runtime-helpers.js";
import { ensureDirecLayout } from "./workspace-io.js";

export async function runPipeline(options: RunPipelineOptions): Promise<PipelineRunResult> {
  await ensureDirecLayout(options.repositoryRoot);
  const now = options.now ?? (() => new Date());
  const plan = planPipelineExecution(options);
  const runId = createRunId(now);
  const startedAt = now().toISOString();
  const runDirectory = join(options.repositoryRoot, ".direc", "runs", runId);
  const latestDirectory = join(
    options.repositoryRoot,
    ".direc",
    "latest",
    sanitiseSegment(plan.pipeline.id),
  );
  await rm(latestDirectory, { recursive: true, force: true });
  const artifacts = await collectArtifacts(options, plan, runId, now);
  const deliveries = await deliverArtifacts(
    options,
    plan,
    artifacts,
    runDirectory,
    latestDirectory,
    runId,
    now,
  );
  const manifest = createManifest(
    runId,
    plan.pipeline.id,
    plan.sourceConfig.id,
    startedAt,
    artifacts,
    deliveries,
    now,
  );
  const manifestPath = join(runDirectory, "manifest.json");

  await writePersistedSnapshot({
    directory: runDirectory,
    manifest,
  });
  await writePersistedSnapshot({
    directory: latestDirectory,
    manifest,
  });

  return {
    manifest,
    manifestPath,
    latestPath: join(latestDirectory, "manifest.json"),
    artifacts,
    deliveries,
  };
}

export async function watchPipeline(options: WatchPipelineOptions): Promise<{ close: () => void }> {
  const plan = planPipelineExecution(options);
  const onResult = options.onResult ?? (() => undefined);
  const onError = options.onError ?? (() => undefined);
  let queue = Promise.resolve();
  let closed = false;

  onResult(await runPipeline(options));

  if (!plan.sourcePlugin.watch) {
    throw new Error(`Source ${plan.sourcePlugin.id} does not support watch mode.`);
  }

  const handle = await plan.sourcePlugin.watch({
    repositoryRoot: options.repositoryRoot,
    pipelineId: plan.pipeline.id,
    sourceConfig: plan.sourceConfig,
    projectContext: options.projectContext,
    now: options.now ?? (() => new Date()),
    onChange: () => {
      if (closed) {
        return;
      }

      queue = queue.then(async () => {
        try {
          onResult(await runPipeline(options));
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
  });

  return {
    close: () => {
      closed = true;
      handle.close();
    },
  };
}
