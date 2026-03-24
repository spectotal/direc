import { WORKFLOW_IDS } from "direc-engine";
import {
  loadConfiguredAnalysisEnvironment,
  readDirecConfig,
  resolveRequestedWorkflowId,
  resolveWorkflowAdapter,
  runAnalysis,
  watchAnalysis,
} from "direc-engine";
import { formatAnalysisResult, formatFacetList } from "../lib/analysis-output.js";

type AnalyzeOptions = {
  change?: string;
  workflow?: string;
  watch?: boolean;
  extension?: string[];
};

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const repositoryRoot = process.cwd();
  const config = await readDirecConfig(repositoryRoot);

  if (!config) {
    throw new Error("Missing .direc/config.json. Run `direc init` first.");
  }

  const environment = await loadConfiguredAnalysisEnvironment({
    repositoryRoot,
    config,
    cliExtensions: options.extension,
  });
  const workflowId = resolveRequestedWorkflowId(options.workflow, config.workflow);
  const workflowAdapter = resolveWorkflowAdapter(workflowId);

  process.stdout.write(
    `Analyzing ${repositoryRoot} with facets: ${formatFacetList(environment.detectedFacets)}\n`,
  );

  if (options.watch) {
    await runWatchAnalysis({
      repositoryRoot,
      workflowAdapter,
      changeFilter: options.change,
      detectedFacets: environment.detectedFacets,
      analyzers: environment.analyzers,
      config,
    });
    return;
  }

  const results = await runAnalysis({
    repositoryRoot,
    workflowAdapter,
    changeFilter: options.change,
    detectedFacets: environment.detectedFacets,
    analyzers: environment.analyzers,
    config,
  });

  if (results.length === 0) {
    process.stdout.write(
      options.change && workflowId === WORKFLOW_IDS.OPENSPEC
        ? `No OpenSpec change found matching ${options.change}.\n`
        : "No analysis events found.\n",
    );
    return;
  }

  for (const result of results) {
    process.stdout.write(formatAnalysisResult(result));
  }
}

async function runWatchAnalysis(options: {
  repositoryRoot: string;
  workflowAdapter: ReturnType<typeof resolveWorkflowAdapter>;
  changeFilter?: string;
  detectedFacets: Awaited<ReturnType<typeof loadConfiguredAnalysisEnvironment>>["detectedFacets"];
  analyzers: Awaited<ReturnType<typeof loadConfiguredAnalysisEnvironment>>["analyzers"];
  config: NonNullable<Awaited<ReturnType<typeof readDirecConfig>>>;
}): Promise<void> {
  process.stdout.write(
    `Watching ${options.workflowAdapter.displayName} analysis. Press Ctrl+C to stop.\n`,
  );

  const watcher = await watchAnalysis({
    repositoryRoot: options.repositoryRoot,
    workflowAdapter: options.workflowAdapter,
    changeFilter: options.changeFilter,
    detectedFacets: options.detectedFacets,
    analyzers: options.analyzers,
    config: options.config,
    onResult: (result) => {
      process.stdout.write(formatAnalysisResult(result));
    },
  });

  await new Promise<void>((resolve) => {
    const handleSignal = () => {
      watcher.close();
      process.stdout.write(`Stopped ${options.workflowAdapter.displayName} analysis watch.\n`);
      process.off("SIGINT", handleSignal);
      resolve();
    };

    process.on("SIGINT", handleSignal);
  });
}
