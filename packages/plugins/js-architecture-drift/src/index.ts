import type {
  AnalyzerPlugin,
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
} from "direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, filterPathsWithPatterns } from "direc-analysis-runtime";
import { createDefaultOptions, defaultPrerequisiteCheck } from "./defaults.js";
import {
  buildEmptySnapshot,
  collectBoundaryViolations,
  createCycleFindings,
  filterResult,
} from "./findings.js";
import { runArchitectureTool } from "./runner.js";
import { resolveTargetPaths, resolveTsConfigPath } from "./scope.js";
import type { ArchitectureDriftPluginOptions, ArchitectureRunner, BoundaryRule } from "./types.js";

type ArchitecturePluginFactoryOptions = {
  prerequisiteCheck?: () => Promise<AnalyzerPrerequisiteResult>;
  runner?: ArchitectureRunner;
};

export type { ArchitectureDriftPluginOptions, BoundaryRule };

export function createJsArchitectureDriftPlugin(
  factoryOptions: ArchitecturePluginFactoryOptions = {},
): AnalyzerPlugin<ArchitectureDriftPluginOptions> {
  return {
    id: "js-architecture-drift",
    displayName: "JS Architecture Drift",
    supportedFacets: ["js"],
    prerequisites: [
      {
        id: "madge",
        description: "Dependency graph analysis engine",
        check: factoryOptions.prerequisiteCheck ?? defaultPrerequisiteCheck,
      },
    ],
    createDefaultOptions,
    async run(context): Promise<AnalyzerSnapshot> {
      const runner = factoryOptions.runner ?? runArchitectureTool;
      const excludePaths = context.options.excludePaths ?? [...DEFAULT_ANALYZER_EXCLUDE_PATTERNS];
      const targetPaths = filterPathsWithPatterns(
        resolveTargetPaths(
          context.repositoryRoot,
          context.event.pathScopes ?? [],
          context.detectedFacets,
        ),
        excludePaths,
      );

      if (targetPaths.length === 0) {
        return buildEmptySnapshot({
          repositoryRoot: context.repositoryRoot,
          event: context.event,
          excludePaths,
        });
      }

      const result = await runner({
        repositoryRoot: context.repositoryRoot,
        targetPaths,
        tsConfigPath: resolveTsConfigPath(context.detectedFacets, context.options.tsConfigPath),
      });
      const filteredResult = filterResult(result, excludePaths);
      const cycleFindings = createCycleFindings(context.repositoryRoot, filteredResult.circular);
      const boundaryFindings = collectBoundaryViolations(
        context.repositoryRoot,
        filteredResult.graph,
        context.options.boundaryRules ?? [],
      );

      return {
        analyzerId: "js-architecture-drift",
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings: [...cycleFindings, ...boundaryFindings],
        metrics: {
          moduleCount: Object.keys(filteredResult.graph).length,
          cycleCount: filteredResult.circular.length,
          boundaryViolationCount: boundaryFindings.length,
          excludedPathCount:
            Object.keys(result.graph).length - Object.keys(filteredResult.graph).length,
        },
        metadata: {
          graph: filteredResult.graph,
          circular: filteredResult.circular,
          excludePaths,
        },
      };
    },
  };
}
