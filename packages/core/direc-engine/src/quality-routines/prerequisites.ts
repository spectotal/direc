import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type {
  AnalyzerPrerequisiteResult,
  QualityRoutineConfig,
} from "@spectotal/direc-analysis-runtime";

export async function checkQualityRoutinePrerequisite(
  repositoryRoot: string,
  routineName: string,
  config: QualityRoutineConfig,
): Promise<AnalyzerPrerequisiteResult> {
  if (config.mode === "ingest") {
    const reportPath = config.report?.reportPath;

    if (!reportPath) {
      return {
        ok: false,
        summary: `Quality routine ${routineName} is missing report.reportPath.`,
      };
    }

    const absolutePath = resolve(repositoryRoot, reportPath);
    try {
      await access(absolutePath);
      return {
        ok: true,
        summary: `${reportPath} is available.`,
      };
    } catch {
      return {
        ok: false,
        summary: `Quality routine report is missing: ${reportPath}.`,
      };
    }
  }

  if (!config.command?.command) {
    return {
      ok: false,
      summary: `Quality routine ${routineName} is missing command.command.`,
    };
  }

  const ok = await commandExists(config.command.command);
  return {
    ok,
    summary: ok
      ? `${config.command.command} is available for ${routineName}.`
      : `Quality routine command is unavailable: ${config.command.command}.`,
  };
}

async function commandExists(command: string): Promise<boolean> {
  const whichCommand = process.platform === "win32" ? "where" : "which";

  return new Promise((resolveCommand) => {
    const child = spawn(whichCommand, [command], {
      stdio: "ignore",
    });
    child.on("error", () => resolveCommand(false));
    child.on("close", (code) => resolveCommand(code === 0));
  });
}
