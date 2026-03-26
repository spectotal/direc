import type {
  AnalyzerPlugin,
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
} from "@spectotal/direc-analysis-runtime";
import {
  DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  filterPathsWithPatterns,
} from "@spectotal/direc-analysis-runtime";
import { createDefaultOptions, defaultPrerequisiteCheck } from "./defaults.js";
import {
  buildEmptySnapshot,
  createCycleFindings,
  filterResult,
  collectModuleRoleAssignments,
  collectRoleBoundaryViolations,
  collectUnassignedModuleFindings,
  validateRoleConfiguration,
  type ArchitectureRunner,
  type ModuleRoleDefinition,
  type RoleBoundaryRule,
} from "@spectotal/direc-core-architecture-drift";
import { runArchitectureTool } from "./graph/index.js";
import { resolveTargetPaths, resolveTsConfigPath } from "./scope.js";
import type { ArchitectureDriftPluginOptions, JsArchitectureRunnerOptions } from "./types.js";
import { discoverPackageBoundaries, discoverTsConfigPaths } from "./discovery/index.js";

type ArchitecturePluginFactoryOptions = {
  prerequisiteCheck?: () => Promise<AnalyzerPrerequisiteResult>;
  runner?: ArchitectureRunner<JsArchitectureRunnerOptions>;
};

export type { ArchitectureDriftPluginOptions, ModuleRoleDefinition, RoleBoundaryRule };

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
      const moduleRoles = context.options.moduleRoles ?? [];
      const roleBoundaryRules = context.options.roleBoundaryRules ?? [];
      const driftContext = { analyzerId: "js-architecture-drift", facetId: "js" };

      const packageBoundaries = await discoverPackageBoundaries(context.repositoryRoot);
      const tsConfigPaths = await discoverTsConfigPaths(context.repositoryRoot);

      const configValidationFindings = validateRoleConfiguration(
        context.repositoryRoot,
        moduleRoles,
        roleBoundaryRules,
        driftContext,
      );

      const targetPaths = filterPathsWithPatterns(
        resolveTargetPaths(
          context.repositoryRoot,
          context.event.pathScopeMode,
          context.event.pathScopes ?? [],
          packageBoundaries,
        ),
        excludePaths,
      );

      if (targetPaths.length === 0) {
        return buildEmptySnapshot({
          repositoryRoot: context.repositoryRoot,
          event: context.event,
          excludePaths,
          findings: configValidationFindings,
          context: driftContext,
        });
      }

      const result = await runner({
        repositoryRoot: context.repositoryRoot,
        targetPaths,
        tsConfigPath: resolveTsConfigPath(tsConfigPaths, context.options.tsConfigPath),
        packageBoundaries,
      });
      const filteredResult = filterResult(result, excludePaths);
      const cycleFindings = createCycleFindings(
        context.repositoryRoot,
        filteredResult.circular,
        driftContext,
      );
      const moduleRoleAssignments = collectModuleRoleAssignments(filteredResult.graph, moduleRoles);
      const roleBoundaryFindings = collectRoleBoundaryViolations(
        context.repositoryRoot,
        filteredResult.graph,
        moduleRoleAssignments,
        roleBoundaryRules,
        driftContext,
      );
      const unassignedModuleFindings = collectUnassignedModuleFindings(
        context.repositoryRoot,
        filteredResult.graph,
        moduleRoleAssignments,
        driftContext,
      );
      const findings = [
        ...configValidationFindings,
        ...cycleFindings,
        ...roleBoundaryFindings,
        ...unassignedModuleFindings,
      ];

      return {
        analyzerId: driftContext.analyzerId,
        timestamp: new Date().toISOString(),
        repositoryRoot: context.repositoryRoot,
        event: context.event,
        findings,
        metrics: {
          moduleCount: Object.keys(filteredResult.graph).length,
          cycleCount: filteredResult.circular.length,
          boundaryViolationCount: roleBoundaryFindings.length,
          unassignedModuleCount: unassignedModuleFindings.length,
          configIssueCount: configValidationFindings.length,
          excludedPathCount:
            Object.keys(result.graph).length - Object.keys(filteredResult.graph).length,
        },
        metadata: {
          graph: filteredResult.graph,
          circular: filteredResult.circular,
          excludePaths,
          moduleRoles: moduleRoleAssignments,
        },
      };
    },
  };
}
