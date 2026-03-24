import type {
  AnalyzerPlugin,
  DetectedFacet,
  DirecConfig,
  RuntimeExecutionResult,
} from "direc-analysis-runtime";
import { processWorkflowEvent } from "direc-analysis-runtime";
import {
  normalizeOpenSpecSnapshot,
  takeOpenSpecSnapshot,
  watchOpenSpecChanges,
} from "direc-adapter-openspec";

type AnalysisOptions = {
  repositoryRoot: string;
  changeFilter?: string;
  detectedFacets: DetectedFacet[];
  analyzers: AnalyzerPlugin[];
  config: DirecConfig;
};

export async function runSnapshotAnalysis(
  options: AnalysisOptions,
): Promise<RuntimeExecutionResult[]> {
  const snapshot = await takeOpenSpecSnapshot({
    projectRoot: options.repositoryRoot,
    changeFilter: options.changeFilter,
  });
  const events = normalizeOpenSpecSnapshot(snapshot, options.repositoryRoot);

  if (events.length === 0) {
    return [];
  }

  const results: RuntimeExecutionResult[] = [];
  for (const event of events) {
    results.push(await processEvent(options, event));
  }

  return results;
}

export async function watchAnalysis(
  options: AnalysisOptions & {
    onResult: (result: RuntimeExecutionResult) => void;
  },
): Promise<{ close: () => void }> {
  let queue = Promise.resolve();

  return watchOpenSpecChanges({
    projectRoot: options.repositoryRoot,
    changeFilter: options.changeFilter,
    onEvent: (event) => {
      queue = queue.then(async () => {
        options.onResult(await processEvent(options, event));
      });
    },
  });
}

async function processEvent(
  options: AnalysisOptions,
  event: Parameters<typeof processWorkflowEvent>[0]["event"],
): Promise<RuntimeExecutionResult> {
  return processWorkflowEvent({
    repositoryRoot: options.repositoryRoot,
    event,
    detectedFacets: options.detectedFacets,
    plugins: options.analyzers,
    config: options.config,
  });
}
