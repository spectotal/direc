import { spinner } from "@clack/prompts";
import {
  DIREC_BOUND_BUNDLE,
  formatNextStepNotice,
  scaffoldInitBundles,
} from "@spectotal/direc-agent-skills";
import {
  bootstrapAnalysisEnvironment,
  buildDirecConfig,
  ensureDirectory,
  resolveAnalyzers,
  writeDirecConfig,
} from "@spectotal/direc-engine";
import {
  isInitCancelledError,
  resolveSelectedAgents,
  type InitAgentDependencies,
} from "./init-agents.js";
import { guardExistingConfig, resolveInitPaths } from "./init-files.js";
import { renderBrandIntro } from "../ui/brand/intro.js";
import { renderInitCompletion } from "../ui/init/completion.js";
import {
  assertConfiguredAnalyzers,
  buildInitSummaryLines,
  formatInitSummary,
} from "./init-output.js";
import type { SupportedAgent } from "@spectotal/direc-agent-skills";

type InitOptions = {
  force?: boolean;
  agent?: string[];
  extension?: string[];
};

type InitCommandDependencies = InitAgentDependencies;
type InitEnvironment = Awaited<ReturnType<typeof bootstrapAnalysisEnvironment>>;
type InitConfig = Awaited<ReturnType<typeof buildDirecConfig>>["config"];
type InitExecutionResult = {
  config: InitConfig;
  configuredAnalyzerIds: string[];
  environment: InitEnvironment;
  nextStep: string;
  selectedAgents: SupportedAgent[];
};

export async function initCommand(
  options: InitOptions,
  dependencies: InitCommandDependencies = {},
): Promise<void> {
  const rootDir = process.cwd();
  const paths = resolveInitPaths(rootDir);
  const stdin = dependencies.stdin ?? process.stdin;
  const stdout = dependencies.stdout ?? process.stdout;
  const canRenderRichUi = shouldRenderRichInitUi(stdin, stdout);

  if (canRenderRichUi) {
    await renderBrandIntro();
  }

  await guardExistingConfig(paths.configFile, options.force ?? false);

  let selectedAgents: SupportedAgent[];

  try {
    selectedAgents = await resolveSelectedAgents(options.agent, dependencies);
  } catch (error) {
    if (isInitCancelledError(error)) {
      return;
    }

    throw error;
  }

  const result = canRenderRichUi
    ? await runInitSetupWithSpinner({
        force: options.force,
        repositoryRoot: rootDir,
        selectedAgents,
        specsDir: paths.specsDir,
        extensions: options.extension,
      })
    : await runInitSetup({
        force: options.force,
        repositoryRoot: rootDir,
        selectedAgents,
        specsDir: paths.specsDir,
        extensions: options.extension,
      });

  if (canRenderRichUi) {
    renderInitCompletion({
      summaryLines: buildInitSummaryLines(
        rootDir,
        result.config,
        result.environment,
        result.configuredAnalyzerIds,
        {
          selectedAgents: result.selectedAgents,
        },
      ),
      nextStep: result.nextStep,
      stdout,
    });
    return;
  }

  stdout.write(
    formatInitSummary(rootDir, result.config, result.environment, result.configuredAnalyzerIds, {
      selectedAgents: result.selectedAgents,
      nextStep: result.nextStep,
    }),
  );
}

async function runInitSetup(options: {
  extensions?: string[];
  force?: boolean;
  repositoryRoot: string;
  selectedAgents: SupportedAgent[];
  specsDir: string;
  onProgress?: (message: string) => void;
}): Promise<InitExecutionResult> {
  options.onProgress?.("Preparing workspace directories");
  await ensureDirectory(options.specsDir);

  options.onProgress?.("Inspecting repository facets");
  const environment = await bootstrapAnalysisEnvironment({
    repositoryRoot: options.repositoryRoot,
    cliExtensions: options.extensions,
  });

  options.onProgress?.("Generating Direc configuration");
  const { config } = await buildDirecConfig({
    repositoryRoot: options.repositoryRoot,
    detectedFacets: environment.detectedFacets,
    plugins: environment.analyzers,
    extensions: environment.extensionSources,
    qualityRoutines: environment.qualityRoutines,
  });

  options.onProgress?.("Resolving analyzers");
  const resolution = await resolveAnalyzers({
    plugins: environment.analyzers,
    repositoryRoot: options.repositoryRoot,
    detectedFacets: environment.detectedFacets,
    config: config.analyzers,
  });
  const configuredAnalyzerIds = assertConfiguredAnalyzers(config, resolution);
  const nextStep = formatNextStepNotice(DIREC_BOUND_BUNDLE.id);

  options.onProgress?.("Writing Direc config");
  await writeDirecConfig(options.repositoryRoot, config);

  options.onProgress?.("Scaffolding agent workflows");
  await scaffoldInitBundles({
    repositoryRoot: options.repositoryRoot,
    agents: options.selectedAgents,
    bundles: [DIREC_BOUND_BUNDLE.id],
    force: options.force,
  });

  return {
    config,
    configuredAnalyzerIds,
    environment,
    nextStep,
    selectedAgents: options.selectedAgents,
  };
}

async function runInitSetupWithSpinner(options: {
  extensions?: string[];
  force?: boolean;
  repositoryRoot: string;
  selectedAgents: SupportedAgent[];
  specsDir: string;
}): Promise<InitExecutionResult> {
  const progress = spinner();
  progress.start("Preparing Direc workspace");

  try {
    const result = await runInitSetup({
      ...options,
      onProgress(message) {
        progress.message(message);
      },
    });

    progress.stop("Direc workspace initialized");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Direc initialization failed.";
    progress.stop(message, 1);
    throw error;
  }
}

function shouldRenderRichInitUi(
  stdin: InitAgentDependencies["stdin"] | typeof process.stdin,
  stdout: InitAgentDependencies["stdout"] | typeof process.stdout,
): boolean {
  return stdin === process.stdin && stdout === process.stdout && !!stdin.isTTY && !!stdout.isTTY;
}
