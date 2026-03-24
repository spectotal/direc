import {
  dispatchAutomationEvent,
  type AutomationDispatchResult,
} from "@spectotal/direc-automation-runtime";
import type {
  AnalyzerPlugin,
  AutomationConfig,
  DetectedFacet,
  DirecConfig,
  RuntimeExecutionResult,
} from "@spectotal/direc-analysis-runtime";
import type { WorkflowAdapter } from "@spectotal/direc-workflow-runtime";
import { processAnalysisEvent } from "./analysis-runner.js";

export interface AutomationRunResult {
  analysis: RuntimeExecutionResult;
  automation: AutomationDispatchResult;
}

type AutomationRunnerOptions = {
  repositoryRoot: string;
  workflowAdapter: WorkflowAdapter;
  changeFilter?: string;
  detectedFacets: DetectedFacet[];
  analyzers: AnalyzerPlugin[];
  config: DirecConfig & { automation: AutomationConfig };
};

export async function watchAutomation(
  options: AutomationRunnerOptions & {
    onResult: (result: AutomationRunResult) => void;
    watchEvents?: WorkflowAdapter["watchEvents"];
  },
): Promise<{ close: () => void }> {
  let queue = Promise.resolve();
  const watchEvents =
    options.watchEvents ?? options.workflowAdapter.watchEvents.bind(options.workflowAdapter);

  return watchEvents({
    repositoryRoot: options.repositoryRoot,
    changeFilter: options.changeFilter,
    includeWorkItemTransitions: options.config.automation.triggers.workItemTransitions,
    onEvent: (event) => {
      queue = queue.then(async () => {
        const analysis = await processAnalysisEvent(
          {
            repositoryRoot: options.repositoryRoot,
            workflowAdapter: options.workflowAdapter,
            changeFilter: options.changeFilter,
            detectedFacets: options.detectedFacets,
            analyzers: options.analyzers,
            config: options.config,
          },
          event,
        );
        const automation = await dispatchAutomationEvent({
          repositoryRoot: options.repositoryRoot,
          event,
          detectedFacets: options.detectedFacets,
          analysisResult: analysis,
          profile: options.config.automation,
        });

        options.onResult({
          analysis,
          automation,
        });
      });
    },
  });
}
