import {
  loadConfiguredAnalysisEnvironment,
  readDirecConfig,
  resolveRequestedWorkflowId,
  resolveWorkflowAdapter,
  watchAutomation,
} from "@spectotal/direc-engine";
import { formatAnalysisResult, formatFacetList } from "../lib/analysis-output.js";
import { formatAutomationDispatch } from "../lib/automation-output.js";

type AutomateOptions = {
  change?: string;
  workflow?: string;
  extension?: string[];
};

export async function automateCommand(options: AutomateOptions): Promise<void> {
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
  const workflowId = resolveRequestedWorkflowId(options.workflow, config.workflow);
  const workflowAdapter = resolveWorkflowAdapter(workflowId);

  if (!workflowAdapter.supportsAutomation) {
    throw new Error(`Workflow ${workflowId} does not support automation.`);
  }

  const environment = await loadConfiguredAnalysisEnvironment({
    repositoryRoot,
    config,
    cliExtensions: options.extension,
  });

  process.stdout.write(
    `Automating ${repositoryRoot} with facets: ${formatFacetList(environment.detectedFacets)}\n`,
  );
  process.stdout.write(
    `Automation profile: ${automationConfig.mode}, ${automationConfig.invocation}, ${automationConfig.transport.kind}\n`,
  );
  process.stdout.write("Watching workflow events. Press Ctrl+C to stop.\n");

  const watcher = await watchAutomation({
    repositoryRoot,
    workflowAdapter,
    changeFilter: options.change,
    detectedFacets: environment.detectedFacets,
    analyzers: environment.analyzers,
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
