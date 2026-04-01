import { runPipeline, watchPipeline } from "@spectotal/direc-pipeline-manager";
import {
  closeHandles,
  countBlockingArtifacts,
  countDeliveredArtifacts,
  loadPipelineRuntime,
  selectPipelineIds,
} from "./pipeline-runtime.js";

export async function runCommand(
  repositoryRoot: string,
  pipelineId?: string,
): Promise<Awaited<ReturnType<typeof runPipeline>>[]> {
  const runtime = await loadPipelineRuntime(repositoryRoot);
  const selectedPipelineIds = selectPipelineIds(
    runtime.config.pipelines.map((pipeline) => pipeline.id),
    pipelineId,
  );
  const results = [];

  for (const selectedPipelineId of selectedPipelineIds) {
    results.push(
      await runPipeline({
        repositoryRoot,
        config: runtime.config,
        registry: runtime.registry,
        projectContext: runtime.projectContext,
        pipelineId: selectedPipelineId,
      }),
    );
  }

  return results;
}

export async function watchCommand(
  repositoryRoot: string,
  pipelineId?: string,
): Promise<{ close: () => void }> {
  const runtime = await loadPipelineRuntime(repositoryRoot);
  const selectedPipelineIds = selectPipelineIds(
    runtime.config.pipelines.map((pipeline) => pipeline.id),
    pipelineId,
  );
  const handles = await Promise.all(
    selectedPipelineIds.map((selectedPipelineId) =>
      watchPipeline({
        repositoryRoot,
        config: runtime.config,
        registry: runtime.registry,
        projectContext: runtime.projectContext,
        pipelineId: selectedPipelineId,
        onResult(result) {
          process.stdout.write(formatPipelineSummary(result));
        },
      }),
    ),
  );

  return {
    close: () => closeHandles(handles),
  };
}

export function formatPipelineSummary(result: Awaited<ReturnType<typeof runPipeline>>): string {
  const deliveredArtifactCount = countDeliveredArtifacts(result.deliveries);
  const blockingArtifactCount = countBlockingArtifacts(result.artifacts);
  return `${result.manifest.pipelineId}: ${result.artifacts.length} artifact(s), ${deliveredArtifactCount} delivered artifact(s), ${blockingArtifactCount} blocking artifact(s)\n`;
}
