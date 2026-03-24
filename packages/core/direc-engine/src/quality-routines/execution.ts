import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { QualityRoutineConfig } from "@spectotal/direc-analysis-runtime";
import { executeQualityRoutineCommand } from "./execution-command.js";
import { assertQualityRoutineCommand, createFallbackRunResult } from "./execution-defaults.js";
import type { QualityRoutineAdapter, QualityRoutineParseResult } from "./types.js";

export async function parseQualityRoutineReport(options: {
  repositoryRoot: string;
  routineName: string;
  config: QualityRoutineConfig;
  adapter: QualityRoutineAdapter;
}): Promise<QualityRoutineParseResult> {
  const reportPath = options.config.report?.reportPath;

  if (!reportPath) {
    throw new Error(`Quality routine ${options.routineName} is missing report.reportPath.`);
  }

  const absolutePath = resolve(options.repositoryRoot, reportPath);
  const contents = await readFile(absolutePath, "utf8");

  if (!options.adapter.parseReport) {
    return {
      findings: [],
      metadata: {
        reportPath,
      },
      rawOutput: contents,
    };
  }

  return options.adapter.parseReport({
    repositoryRoot: options.repositoryRoot,
    routineName: options.routineName,
    config: options.config,
    reportPath,
    contents,
  });
}

export async function runQualityRoutineCommand(options: {
  repositoryRoot: string;
  routineName: string;
  config: QualityRoutineConfig;
  adapter: QualityRoutineAdapter;
  targetPaths: string[];
  scopedToEventPaths: boolean;
}): Promise<QualityRoutineParseResult> {
  const command = assertQualityRoutineCommand(options.routineName, options.config.command);

  const execution = await executeQualityRoutineCommand({
    repositoryRoot: options.repositoryRoot,
    command,
    targetPaths: options.targetPaths,
    scopedToEventPaths: options.scopedToEventPaths,
  });

  if (!options.adapter.parseRunResult) {
    return createFallbackRunResult(options.repositoryRoot, options.routineName, execution);
  }

  return options.adapter.parseRunResult({
    repositoryRoot: options.repositoryRoot,
    routineName: options.routineName,
    config: options.config,
    execution,
  });
}

export { resolveScopedPaths } from "./execution-paths.js";
