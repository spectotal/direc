import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { QualityRoutineCommandConfig } from "@spectotal/direc-analysis-runtime";
import type { QualityRoutineExecutionResult } from "./types.js";

export async function executeQualityRoutineCommand(options: {
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
        cwd: resolveCommandDirectory(options.repositoryRoot, options.command),
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

function resolveCommandDirectory(
  repositoryRoot: string,
  command: QualityRoutineCommandConfig,
): string {
  if (command.cwd) {
    return resolve(repositoryRoot, command.cwd);
  }

  return repositoryRoot;
}
