import { readDirecConfig } from "direc-analysis-runtime";
import { detectRepositoryFacets } from "direc-facet-detect";
import { formatAnalysisResult, formatFacetList } from "../lib/analysis-output.js";
import { formatAutomationDispatch } from "../lib/automation-output.js";
import { watchAutomation } from "../lib/automation-runner.js";
import { getRegisteredAnalyzers } from "../lib/analyzers.js";
import { resolveRequestedWorkflowId, resolveWorkflowAdapter } from "../registry/workflows.js";

type AutomateOptions = {
  change?: string;
  workflow?: string;
};

export async function automateCommand(options: AutomateOptions): Promise<void> {
  if (!options.workflow) {
    throw new Error("Missing workflow. Use `direc automate --workflow openspec`.");
  }
  const workflowId = resolveRequestedWorkflowId(options.workflow);
  const workflowAdapter = resolveWorkflowAdapter(workflowId);

  const repositoryRoot = process.cwd();
  const config = await readDirecConfig(repositoryRoot);

  if (!config) {
    throw new Error("Missing .direc/config.json. Run `direc init` first.");
  }

  if (!config.automation) {
    throw new Error(
      "Missing automation configuration in .direc/config.json. Run `direc init --force` to seed automation defaults.",
    );
  }
  const automationConfig = config.automation;

  if (!workflowAdapter.supportsAutomation) {
    throw new Error(`Workflow ${workflowId} does not support automation.`);
  }

  const detectedFacets = await detectRepositoryFacets(repositoryRoot);
  const analyzers = getRegisteredAnalyzers();

  process.stdout.write(
    `Automating ${repositoryRoot} with facets: ${formatFacetList(detectedFacets)}\n`,
  );
  process.stdout.write(
    `Automation profile: ${automationConfig.mode}, ${automationConfig.invocation}, ${automationConfig.transport.kind}\n`,
  );
  process.stdout.write("Watching workflow events. Press Ctrl+C to stop.\n");

  const watcher = await watchAutomation({
    repositoryRoot,
    workflowAdapter,
    changeFilter: options.change,
    detectedFacets,
    analyzers,
    config: { ...config, automation: automationConfig },
    onResult: (result) => {
      process.stdout.write(formatAnalysisResult(result.analysis));
      process.stdout.write(`${formatAutomationDispatch(result.automation)}\n\n`);
    },
  });

  await new Promise<void>((resolve) => {
    const handleSignal = () => {
      watcher.close();
      process.stdout.write("Stopped workflow automation watch.\n");
      process.off("SIGINT", handleSignal);
      resolve();
    };

    process.on("SIGINT", handleSignal);
  });
}
