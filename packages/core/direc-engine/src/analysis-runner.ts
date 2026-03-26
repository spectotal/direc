import type {
  AnalyzerPlugin,
  DetectedFacet,
  DirecConfig,
  RuntimeExecutionResult,
} from "@spectotal/direc-analysis-runtime";
import { processWorkflowEvent } from "@spectotal/direc-analysis-runtime";
import type { WorkflowAdapter } from "@spectotal/direc-workflow-runtime";

type AnalysisOptions = {
  repositoryRoot: string;
  workflowAdapter: WorkflowAdapter;
  changeFilter?: string;
  detectedFacets: DetectedFacet[];
  analyzers: AnalyzerPlugin[];
  config: DirecConfig;
};

export async function runAnalysis(options: AnalysisOptions): Promise<RuntimeExecutionResult[]> {
  const events = await options.workflowAdapter.loadAnalysisEvents({
    repositoryRoot: options.repositoryRoot,
    changeFilter: options.changeFilter,
  });

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

  return options.workflowAdapter.watchEvents({
    repositoryRoot: options.repositoryRoot,
    changeFilter: options.changeFilter,
    onEvent: (event) => {
      queue = queue.then(async () => {
        options.onResult(await processEvent(options, event));
      });
    },
  });
}

export async function processAnalysisEvent(
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

async function processEvent(
  options: AnalysisOptions,
  event: Parameters<typeof processWorkflowEvent>[0]["event"],
): Promise<RuntimeExecutionResult> {
  return processAnalysisEvent(options, event);
}
