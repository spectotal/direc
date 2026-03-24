import type {
  AnalyzerPlugin,
  AnalyzerPrerequisiteResult,
  AnalyzerSnapshot,
} from "direc-analysis-runtime";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, filterPathsWithPatterns } from "direc-analysis-runtime";
import { createDefaultOptions, defaultPrerequisiteCheck } from "./defaults.js";
import { buildEmptySnapshot, createCycleFindings, filterResult } from "./findings.js";
import {
  collectModuleRoleAssignments,
  collectRoleBoundaryViolations,
  collectUnassignedModuleFindings,
} from "./roles.js";
import { runArchitectureTool } from "./runner.js";
import { resolveTargetPaths, resolveTsConfigPath } from "./scope.js";
import { validateRoleConfiguration } from "./validation.js";
import type {
  ArchitectureDriftPluginOptions,
  ArchitectureRunner,
  ModuleRoleDefinition,
  RoleBoundaryRule,
} from "./types.js";

type ArchitecturePluginFactoryOptions = {
  prerequisiteCheck?: () => Promise<AnalyzerPrerequisiteResult>;
  runner?: ArchitectureRunner;
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
      const configValidationFindings = validateRoleConfiguration(
        context.repositoryRoot,
        moduleRoles,
        roleBoundaryRules,
      );
      const targetPaths = filterPathsWithPatterns(
        resolveTargetPaths(
          context.repositoryRoot,
          context.event.pathScopeMode,
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
          findings: configValidationFindings,
        });
      }

      const result = await runner({
        repositoryRoot: context.repositoryRoot,
        targetPaths,
        tsConfigPath: resolveTsConfigPath(context.detectedFacets, context.options.tsConfigPath),
      });
      const filteredResult = filterResult(result, excludePaths);
      const cycleFindings = createCycleFindings(context.repositoryRoot, filteredResult.circular);
      const moduleRoleAssignments = collectModuleRoleAssignments(filteredResult.graph, moduleRoles);
      const roleBoundaryFindings = collectRoleBoundaryViolations(
        context.repositoryRoot,
        filteredResult.graph,
        moduleRoleAssignments,
        roleBoundaryRules,
      );
      const unassignedModuleFindings = collectUnassignedModuleFindings(
        context.repositoryRoot,
        filteredResult.graph,
        moduleRoleAssignments,
      );
      const findings = [
        ...configValidationFindings,
        ...cycleFindings,
        ...roleBoundaryFindings,
        ...unassignedModuleFindings,
      ];

      return {
        analyzerId: "js-architecture-drift",
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
