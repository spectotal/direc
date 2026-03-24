import { fileURLToPath } from "node:url";
import {
  type AnalyzerPlugin,
  type AutomationConfig,
  type DetectedFacet,
  type DirecConfig,
  type QualityRoutineConfig,
} from "direc-analysis-runtime";
import { WORKFLOW_IDS } from "direc-workflow-runtime";

type BuildDirecConfigOptions = {
  repositoryRoot: string;
  detectedFacets: DetectedFacet[];
  plugins: AnalyzerPlugin[];
  extensions?: string[];
  qualityRoutines?: Record<string, QualityRoutineConfig>;
};

export async function buildDirecConfig(options: BuildDirecConfigOptions): Promise<{
  config: DirecConfig;
}> {
  const enabledFacetIds = new Set(options.detectedFacets.map((facet) => facet.id));
  const analyzerEntries = await Promise.all(
    options.plugins.map(async (plugin) => [
      plugin.id,
      {
        enabled:
          (plugin.defaultEnabled ?? true) &&
          plugin.supportedFacets.some((facetId) => enabledFacetIds.has(facetId)),
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
    ...(options.extensions && options.extensions.length > 0
      ? { extensions: options.extensions }
      : {}),
    ...(options.qualityRoutines && Object.keys(options.qualityRoutines).length > 0
      ? { qualityRoutines: options.qualityRoutines }
      : {}),
    automation: buildAutomationConfig(),
    analyzers: Object.fromEntries(analyzerEntries),
  };

  return {
    config: initialConfig,
  };
}

function buildAutomationConfig(): AutomationConfig {
  const bundledBackendPath = fileURLToPath(new URL("../bin/direc-subagent.js", import.meta.url));

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
      snapshotEvents: true,
      workItemTransitions: true,
      artifactTransitions: false,
      changeCompleted: true,
    },
  };
}
