import { readWorkspaceConfig, runPipeline, watchPipeline } from "@spectotal/direc-pipeline-manager";
import { detectProjectContext } from "../project-context.js";
import { createBuiltinRegistry } from "../registry.js";

interface PipelineHandle {
  close: () => void;
}

interface PipelineRuntime {
  config: Awaited<ReturnType<typeof readWorkspaceConfig>>;
  projectContext: Awaited<ReturnType<typeof detectProjectContext>>;
  registry: ReturnType<typeof createBuiltinRegistry>;
}

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
  const noticeCount = result.artifacts.filter(
    (artifact) => artifact.type === "feedback.notice",
  ).length;
  const verdictCount = result.artifacts.filter(
    (artifact) => artifact.type === "feedback.verdict",
  ).length;
  return `${result.manifest.pipelineId}: ${result.artifacts.length} artifact(s), ${noticeCount} notice(s), ${verdictCount} verdict(s)\n`;
}

async function loadPipelineRuntime(repositoryRoot: string): Promise<PipelineRuntime> {
  const config = await readWorkspaceConfig(repositoryRoot);
  const projectContext = await detectProjectContext(repositoryRoot);

  return {
    config,
    projectContext,
    registry: createBuiltinRegistry(),
  };
}

function selectPipelineIds(allPipelineIds: string[], pipelineId: string | undefined): string[] {
  return pipelineId ? [pipelineId] : allPipelineIds;
}

function closeHandles(handles: PipelineHandle[]): void {
  for (const handle of handles) {
    handle.close();
  }
}
