import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { relative, resolve } from "node:path";
import type {
  DetectedFacet,
  QualityRoutineCommandConfig,
  QualityRoutineConfig,
} from "direc-analysis-runtime";
import { createRepositoryFinding } from "./helpers.js";
import type {
  QualityRoutineAdapter,
  QualityRoutineExecutionResult,
  QualityRoutineParseResult,
} from "./types.js";

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
  const command = options.config.command;

  if (!command?.command) {
    throw new Error(`Quality routine ${options.routineName} is missing command.command.`);
  }

  const execution = await executeQualityRoutineCommand({
    repositoryRoot: options.repositoryRoot,
    command,
    targetPaths: options.targetPaths,
    scopedToEventPaths: options.scopedToEventPaths,
  });

  if (!options.adapter.parseRunResult) {
    return {
      findings:
        execution.exitCode === 0
          ? []
          : [
              createRepositoryFinding({
                analyzerId: `routine:${options.routineName}`,
                severity: "error",
                category: "quality-routine-failed",
                message: `${options.routineName} exited with code ${execution.exitCode}.`,
                repositoryRoot: options.repositoryRoot,
              }),
            ],
      metrics: {
        exitCode: execution.exitCode,
      },
      metadata: {
        stdout: execution.stdout,
        stderr: execution.stderr,
        targetPaths: execution.targetPaths,
        scopedToEventPaths: execution.scopedToEventPaths,
      },
      rawOutput: {
        stdout: execution.stdout,
        stderr: execution.stderr,
      },
    };
  }

  return options.adapter.parseRunResult({
    repositoryRoot: options.repositoryRoot,
    routineName: options.routineName,
    config: options.config,
    execution,
  });
}

export function resolveScopedPaths(
  repositoryRoot: string,
  eventPathScopes: string[],
  detectedFacets: DetectedFacet[],
  supportedFacets: string[],
): string[] {
  if (eventPathScopes.length > 0) {
    return eventPathScopes.map((path) => relative(repositoryRoot, path));
  }

  for (const facetId of supportedFacets) {
    const facet = detectedFacets.find((entry) => entry.id === facetId);
    const sourcePaths = Array.isArray(facet?.metadata.sourcePaths)
      ? (facet.metadata.sourcePaths as string[])
      : [];

    if (sourcePaths.length > 0) {
      return [...new Set(sourcePaths)].sort();
    }
  }

  return [];
}

async function executeQualityRoutineCommand(options: {
  repositoryRoot: string;
  command: QualityRoutineCommandConfig;
  targetPaths: string[];
  scopedToEventPaths: boolean;
}): Promise<QualityRoutineExecutionResult> {
  return new Promise((resolveExecution, reject) => {
    const child = spawn(
      options.command.command,
      [...(options.command.args ?? []), ...options.targetPaths],
      {
        cwd: options.command.cwd
          ? resolve(options.repositoryRoot, options.command.cwd)
          : options.repositoryRoot,
        env: {
          ...process.env,
          ...options.command.env,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolveExecution({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        timedOut: false,
        targetPaths: options.targetPaths,
        scopedToEventPaths: options.scopedToEventPaths,
      });
    });
  });
}
