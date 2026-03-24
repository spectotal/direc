import type { QualityRoutineConfig } from "./types.js";

export function normalizeQualityRoutines(
  value: unknown,
): Record<string, QualityRoutineConfig> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).flatMap(([routineName, config]) => {
    if (!isRecord(config) || typeof config.adapter !== "string") {
      return [];
    }

    const normalized: QualityRoutineConfig = {
      adapter: config.adapter,
      mode: config.mode === "ingest" ? "ingest" : "run",
      enabled: typeof config.enabled === "boolean" ? config.enabled : true,
    };

    if (isRecord(config.command) && typeof config.command.command === "string") {
      normalized.command = {
        command: config.command.command,
        args: Array.isArray(config.command.args) ? config.command.args.filter(isString) : undefined,
        cwd: typeof config.command.cwd === "string" ? config.command.cwd : undefined,
        env: isRecord(config.command.env)
          ? Object.fromEntries(
              Object.entries(config.command.env).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : undefined,
      };
    }

    if (isRecord(config.report) && typeof config.report.reportPath === "string") {
      normalized.report = {
        reportPath: config.report.reportPath,
      };
    }

    return [[routineName, normalized] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
