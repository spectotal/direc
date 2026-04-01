import { readWorkspaceConfig } from "@spectotal/direc-pipeline-manager";
import { detectProjectContext } from "../project-context.js";
import { createBuiltinRegistry } from "../registry.js";

interface PipelineHandle {
  close: () => void;
}

export interface PipelineRuntime {
  config: Awaited<ReturnType<typeof readWorkspaceConfig>>;
  projectContext: Awaited<ReturnType<typeof detectProjectContext>>;
  registry: ReturnType<typeof createBuiltinRegistry>;
}

export async function loadPipelineRuntime(repositoryRoot: string): Promise<PipelineRuntime> {
  const config = await readWorkspaceConfig(repositoryRoot);
  const projectContext = await detectProjectContext(repositoryRoot);

  return {
    config,
    projectContext,
    registry: createBuiltinRegistry(),
  };
}

export function selectPipelineIds(
  allPipelineIds: string[],
  pipelineId: string | undefined,
): string[] {
  return pipelineId ? [pipelineId] : allPipelineIds;
}

export function closeHandles(handles: PipelineHandle[]): void {
  for (const handle of handles) {
    handle.close();
  }
}

export function countDeliveredArtifacts(deliveries: Array<{ artifactIds: string[] }>): number {
  return deliveries.reduce((count, delivery) => count + delivery.artifactIds.length, 0);
}

export function countBlockingArtifacts(artifacts: Array<{ payload: unknown }>): number {
  return artifacts.filter((artifact) => hasBlockingCount(artifact.payload)).length;
}

function hasBlockingCount(payload: unknown): payload is { errorCount: number } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "errorCount" in payload &&
    typeof (payload as { errorCount?: unknown }).errorCount === "number" &&
    (payload as { errorCount: number }).errorCount > 0
  );
}
