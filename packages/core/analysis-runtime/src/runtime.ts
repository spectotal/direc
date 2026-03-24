import {
  readLatestAnalyzerSnapshot,
  writeAnalyzerSnapshot,
  writeDirecState,
} from "./persistence.js";
import { resolveAnalyzers, serializeAnalyzerResolution } from "./resolve-analyzers.js";
import type {
  AnalyzerPlugin,
  DetectedFacet,
  DirecConfig,
  NormalizedWorkflowEvent,
  RuntimeExecutionResult,
} from "./types.js";

type ProcessWorkflowEventOptions = {
  repositoryRoot: string;
  event: NormalizedWorkflowEvent;
  detectedFacets: DetectedFacet[];
  plugins: AnalyzerPlugin[];
  config: DirecConfig;
};

export async function processWorkflowEvent(
  options: ProcessWorkflowEventOptions,
): Promise<RuntimeExecutionResult> {
  const resolution = await resolveAnalyzers({
    plugins: options.plugins,
    repositoryRoot: options.repositoryRoot,
    detectedFacets: options.detectedFacets,
    config: options.config.analyzers,
    event: options.event,
  });

  const runs: RuntimeExecutionResult["runs"] = [];

  for (const entry of resolution.enabled) {
    try {
      const previousSnapshot = await readLatestAnalyzerSnapshot(
        options.repositoryRoot,
        entry.plugin.id,
      );

      const snapshot = await entry.plugin.run({
        repositoryRoot: options.repositoryRoot,
        event: options.event,
        detectedFacets: options.detectedFacets,
        options: entry.options,
        previousSnapshot,
      });

      const normalizedSnapshot = {
        ...snapshot,
        analyzerId: entry.plugin.id,
        repositoryRoot: options.repositoryRoot,
        event: options.event,
        timestamp: snapshot.timestamp || new Date().toISOString(),
      };

      const { latestPath, historyPath } = await writeAnalyzerSnapshot(
        options.repositoryRoot,
        normalizedSnapshot,
      );

      runs.push({
        analyzerId: entry.plugin.id,
        status: "success",
        snapshot: normalizedSnapshot,
        latestPath,
        historyPath,
      });
    } catch (error) {
      runs.push({
        analyzerId: entry.plugin.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const statePath = await writeDirecState(options.repositoryRoot, {
    updatedAt: new Date().toISOString(),
    detectedFacets: options.detectedFacets,
    resolution: serializeAnalyzerResolution(resolution),
    lastEvent: options.event,
  });

  return {
    event: options.event,
    resolution,
    runs,
    statePath,
  };
}
