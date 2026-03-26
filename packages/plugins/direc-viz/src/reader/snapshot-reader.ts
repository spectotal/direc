import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AnalyzerSnapshot } from "@spectotal/direc-analysis-runtime";

export async function readLatestSnapshot(
  repositoryRoot: string,
  analyzerId: string,
): Promise<AnalyzerSnapshot | null> {
  const snapshotPath = resolve(repositoryRoot, ".direc", "latest", `${analyzerId}.json`);
  try {
    const content = await readFile(snapshotPath, "utf-8");
    return JSON.parse(content) as AnalyzerSnapshot;
  } catch {
    return null;
  }
}
