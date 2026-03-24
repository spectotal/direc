import type {
  AnalyzerConfigEntry,
  AnalyzerDisableReason,
  AnalyzerPlugin,
  AnalyzerResolution,
  DetectedFacet,
  NormalizedWorkflowEvent,
} from "./types.js";

type ResolveAnalyzersOptions = {
  plugins: AnalyzerPlugin[];
  repositoryRoot: string;
  detectedFacets: DetectedFacet[];
  config: Record<string, AnalyzerConfigEntry>;
  event?: NormalizedWorkflowEvent;
};

export async function resolveAnalyzers(
  options: ResolveAnalyzersOptions,
): Promise<AnalyzerResolution> {
  const facetIds = new Set(options.detectedFacets.map((facet) => facet.id));
  const enabled: AnalyzerResolution["enabled"] = [];
  const disabled: AnalyzerResolution["disabled"] = [];

  for (const plugin of options.plugins) {
    const configEntry = options.config[plugin.id];
    const disableReasons: AnalyzerDisableReason[] = [];

    if (configEntry?.enabled === false) {
      disableReasons.push({
        code: "disabled_in_config",
        message: `Analyzer ${plugin.id} is disabled in Direc configuration.`,
      });
    }

    const matchesFacet = plugin.supportedFacets.some((facetId) => facetIds.has(facetId));

    if (!matchesFacet) {
      disableReasons.push({
        code: "facet_mismatch",
        message: `Analyzer ${plugin.id} does not match the detected facet set.`,
      });
    }

    const prerequisiteResults = [];
    for (const prerequisite of plugin.prerequisites ?? []) {
      const result = await prerequisite.check({
        repositoryRoot: options.repositoryRoot,
        detectedFacets: options.detectedFacets,
        event: options.event,
      });

      prerequisiteResults.push({
        id: prerequisite.id,
        result,
      });

      if (!result.ok) {
        disableReasons.push({
          code: "missing_prerequisite",
          message: result.summary,
          prerequisiteId: prerequisite.id,
        });
      }
    }

    if (disableReasons.length > 0) {
      disabled.push({
        pluginId: plugin.id,
        displayName: plugin.displayName,
        supportedFacets: plugin.supportedFacets,
        reasons: disableReasons,
      });
      continue;
    }

    const defaultOptions =
      plugin.createDefaultOptions?.({
        repositoryRoot: options.repositoryRoot,
        detectedFacets: options.detectedFacets,
      }) ?? {};

    enabled.push({
      plugin,
      options: {
        ...defaultOptions,
        ...(configEntry?.options ?? {}),
      },
      prerequisiteResults,
    });
  }

  return {
    enabled,
    disabled,
  };
}

export function serializeAnalyzerResolution(resolution: AnalyzerResolution): {
  enabled: string[];
  disabled: Array<{
    pluginId: string;
    reasons: AnalyzerDisableReason[];
  }>;
} {
  return {
    enabled: resolution.enabled.map((entry) => entry.plugin.id),
    disabled: resolution.disabled.map((entry) => ({
      pluginId: entry.pluginId,
      reasons: entry.reasons,
    })),
  };
}
