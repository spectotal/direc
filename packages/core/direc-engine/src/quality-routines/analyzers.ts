import type {
  AnalyzerPlugin,
  AnalyzerSnapshot,
  QualityRoutineConfig,
} from "direc-analysis-runtime";
import { checkQualityRoutinePrerequisite } from "./prerequisites.js";
import {
  parseQualityRoutineReport,
  resolveScopedPaths,
  runQualityRoutineCommand,
} from "./execution.js";
import type { QualityRoutineAdapter } from "./types.js";

export function createQualityRoutineAnalyzers(options: {
  repositoryRoot: string;
  qualityRoutines?: Record<string, QualityRoutineConfig>;
  adapters: QualityRoutineAdapter[];
}): AnalyzerPlugin[] {
  if (!options.qualityRoutines) {
    return [];
  }

  const adapterMap = new Map(options.adapters.map((adapter) => [adapter.id, adapter]));

  return Object.entries(options.qualityRoutines).map(([routineName, config]) => {
    const adapter = adapterMap.get(config.adapter);

    if (!adapter) {
      throw new Error(`Unknown quality routine adapter: ${config.adapter}`);
    }

    return createQualityRoutineAnalyzer({
      repositoryRoot: options.repositoryRoot,
      routineName,
      config,
      adapter,
    });
  });
}

function createQualityRoutineAnalyzer(options: {
  repositoryRoot: string;
  routineName: string;
  config: QualityRoutineConfig;
  adapter: QualityRoutineAdapter;
}): AnalyzerPlugin {
  const analyzerId = `routine:${options.routineName}`;

  return {
    id: analyzerId,
    displayName: `Routine ${options.routineName}`,
    supportedFacets: options.adapter.supportedFacets,
    defaultEnabled: options.config.enabled,
    prerequisites: [
      {
        id: `quality-routine:${options.routineName}`,
        description: `Quality routine ${options.routineName}`,
        check: () =>
          checkQualityRoutinePrerequisite(
            options.repositoryRoot,
            options.routineName,
            options.config,
          ),
      },
    ],
    async run(context): Promise<AnalyzerSnapshot> {
      const scopedPaths = resolveScopedPaths(
        context.repositoryRoot,
        context.event.pathScopes ?? [],
        context.detectedFacets,
        options.adapter.supportedFacets,
      );
      const targetPaths =
        options.adapter.supportsScopedPaths && scopedPaths.length > 0
          ? scopedPaths
          : options.adapter.defaultTargetPath
            ? [options.adapter.defaultTargetPath]
            : [];
      const scopedToEventPaths = Boolean(
        options.adapter.supportsScopedPaths && scopedPaths.length > 0,
      );
      const parsed =
        options.config.mode === "ingest"
          ? await parseQualityRoutineReport({
              repositoryRoot: context.repositoryRoot,
              routineName: options.routineName,
              config: options.config,
              adapter: options.adapter,
            })
          : await runQualityRoutineCommand({
              repositoryRoot: context.repositoryRoot,
              routineName: options.routineName,
              config: options.config,
              adapter: options.adapter,
              targetPaths,
              scopedToEventPaths,
            });

      return {
        analyzerId,
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings: parsed.findings,
        metrics: parsed.metrics,
        metadata: {
          routineName: options.routineName,
          adapterId: options.adapter.id,
          mode: options.config.mode,
          ...(parsed.metadata ?? {}),
        },
        rawOutput: parsed.rawOutput,
      };
    },
  };
}
