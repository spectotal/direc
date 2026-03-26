import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

export interface HistoryPoint {
  timestamp: string;
  changeId: string;
  metrics: {
    violations: number;
    cycles: number;
    avgComplexity: number;
  };
}

const HISTORY_CAP = 200;

export async function readHistory(
  repositoryRoot: string,
  limit = HISTORY_CAP,
): Promise<HistoryPoint[]> {
  const historyRoot = resolve(repositoryRoot, ".direc", "history");

  let changeDirs: string[];
  try {
    changeDirs = await readdir(historyRoot);
  } catch {
    return [];
  }

  const points: HistoryPoint[] = [];

  for (const changeId of changeDirs) {
    const changePath = join(historyRoot, changeId);
    let files: string[];
    try {
      files = await readdir(changePath);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = JSON.parse(await readFile(join(changePath, file), "utf-8")) as Record<
          string,
          unknown
        >;

        const metrics = raw.metrics as Record<string, number> | undefined;
        const complexityMetadata = raw.metadata as
          | { files?: Array<{ maintainability: number }> }
          | undefined;

        const avgComplexity =
          complexityMetadata?.files && complexityMetadata.files.length > 0
            ? complexityMetadata.files.reduce((sum, f) => sum + (f.maintainability ?? 0), 0) /
              complexityMetadata.files.length
            : 0;

        points.push({
          timestamp:
            typeof raw.timestamp === "string" ? raw.timestamp : (file.split("-")[0] ?? file),
          changeId,
          metrics: {
            violations: metrics?.boundaryViolationCount ?? 0,
            cycles: metrics?.cycleCount ?? 0,
            avgComplexity: Math.round(avgComplexity * 10) / 10,
          },
        });
      } catch {
        // skip unparseable files
      }
    }
  }

  points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return points.slice(-limit);
}
