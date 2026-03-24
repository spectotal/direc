import { fileURLToPath } from "node:url";
import {
  resolveAnalyzers,
  type AnalyzerPlugin,
  type AutomationConfig,
  type DetectedFacet,
  type DirecConfig,
} from "direc-analysis-runtime";
import { WORKFLOW_IDS } from "direc-workflow-runtime";

type BuildDirecConfigOptions = {
  repositoryRoot: string;
  detectedFacets: DetectedFacet[];
  plugins: AnalyzerPlugin[];
};

export async function buildDirecConfig(options: BuildDirecConfigOptions): Promise<{
  config: DirecConfig;
  resolution: Awaited<ReturnType<typeof resolveAnalyzers>>;
}> {
  const analyzerEntries = await Promise.all(
    options.plugins.map(async (plugin) => [
      plugin.id,
      {
        enabled: plugin.defaultEnabled ?? true,
        options:
          plugin.createDefaultOptions?.({
            repositoryRoot: options.repositoryRoot,
            detectedFacets: options.detectedFacets,
          }) ?? {},
      },
    ]),
  );

  const initialConfig: DirecConfig = {
    version: 1,
    generatedAt: new Date().toISOString(),
    workflow: WORKFLOW_IDS.DIREC,
    facets: options.detectedFacets.map((facet) => facet.id),
    automation: buildAutomationConfig(),
    analyzers: Object.fromEntries(analyzerEntries),
  };

  const resolution = await resolveAnalyzers({
    plugins: options.plugins,
    repositoryRoot: options.repositoryRoot,
    detectedFacets: options.detectedFacets,
    config: initialConfig.analyzers,
  });

  const analyzers = Object.fromEntries(
    options.plugins.map((plugin) => {
      const enabledEntry = resolution.enabled.find((entry) => entry.plugin.id === plugin.id);

      return [
        plugin.id,
        {
          enabled: Boolean(enabledEntry),
          options: enabledEntry?.options ?? initialConfig.analyzers[plugin.id]?.options ?? {},
        },
      ];
    }),
  );

  return {
    config: {
      ...initialConfig,
      analyzers,
    },
    resolution,
  };
}

function buildAutomationConfig(): AutomationConfig {
  const bundledBackendPath = fileURLToPath(new URL("../../bin/direc-subagent.js", import.meta.url));

  return {
    enabled: true,
    mode: "advisory",
    invocation: "hybrid",
    failurePolicy: "continue",
    transport: {
      kind: "command",
      command: process.execPath,
      args: [bundledBackendPath],
    },
    triggers: {
      workItemTransitions: true,
      artifactTransitions: false,
      changeCompleted: true,
    },
  };
}
