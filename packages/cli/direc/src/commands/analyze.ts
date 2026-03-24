import { readDirecConfig } from "direc-analysis-runtime";
import { detectRepositoryFacets } from "direc-facet-detect";
import { getRegisteredAnalyzers } from "../lib/analyzers.js";
import { formatAnalysisResult, formatFacetList } from "../lib/analysis-output.js";
import { runSnapshotAnalysis, watchAnalysis } from "../lib/analysis-runner.js";

type AnalyzeOptions = {
  change?: string;
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

  process.stdout.write(
    `Analyzing ${repositoryRoot} with facets: ${formatFacetList(detectedFacets)}\n`,
  );

  if (options.watch) {
    await runWatchAnalysis({
      repositoryRoot,
      changeFilter: options.change,
      detectedFacets,
      analyzers,
      config,
    });
    return;
  }

  const results = await runSnapshotAnalysis({
    repositoryRoot,
    changeFilter: options.change,
    detectedFacets,
    analyzers,
    config,
  });

  if (results.length === 0) {
    process.stdout.write("No active OpenSpec changes found.\n");
    return;
  }

  for (const result of results) {
    process.stdout.write(formatAnalysisResult(result));
  }
}

async function runWatchAnalysis(options: {
  repositoryRoot: string;
  changeFilter?: string;
  detectedFacets: Awaited<ReturnType<typeof detectRepositoryFacets>>;
  analyzers: ReturnType<typeof getRegisteredAnalyzers>;
  config: NonNullable<Awaited<ReturnType<typeof readDirecConfig>>>;
}): Promise<void> {
  process.stdout.write("Watching OpenSpec changes. Press Ctrl+C to stop.\n");

  const watcher = await watchAnalysis({
    repositoryRoot: options.repositoryRoot,
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
      process.stdout.write("Stopped OpenSpec analysis watch.\n");
      process.off("SIGINT", handleSignal);
      resolve();
    };

    process.on("SIGINT", handleSignal);
  });
}
