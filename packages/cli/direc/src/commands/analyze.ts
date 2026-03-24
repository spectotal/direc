import { readDirecConfig } from "direc-analysis-runtime";
import { WORKFLOW_IDS } from "direc-workflow-runtime";
import { detectRepositoryFacets } from "direc-facet-detect";
import { getRegisteredAnalyzers } from "../lib/analyzers.js";
import { formatAnalysisResult, formatFacetList } from "../lib/analysis-output.js";
import { runAnalysis, watchAnalysis } from "../lib/analysis-runner.js";
import { resolveRequestedWorkflowId, resolveWorkflowAdapter } from "../registry/workflows.js";

type AnalyzeOptions = {
  change?: string;
  workflow?: string;
  watch?: boolean;
};

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const repositoryRoot = process.cwd();
  const config = await readDirecConfig(repositoryRoot);

  if (!config) {
    throw new Error("Missing .direc/config.json. Run `direc init` first.");
  }

  const detectedFacets = await detectRepositoryFacets(repositoryRoot);
  const analyzers = getRegisteredAnalyzers();
  const workflowId = resolveRequestedWorkflowId(options.workflow, config.workflow);
  const workflowAdapter = resolveWorkflowAdapter(workflowId);

  process.stdout.write(
    `Analyzing ${repositoryRoot} with facets: ${formatFacetList(detectedFacets)}\n`,
  );

  if (options.watch) {
    await runWatchAnalysis({
      repositoryRoot,
      workflowAdapter,
      changeFilter: options.change,
      detectedFacets,
      analyzers,
      config,
    });
    return;
  }

  const results = await runAnalysis({
    repositoryRoot,
    workflowAdapter,
    changeFilter: options.change,
    detectedFacets,
    analyzers,
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
  detectedFacets: Awaited<ReturnType<typeof detectRepositoryFacets>>;
  analyzers: ReturnType<typeof getRegisteredAnalyzers>;
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
