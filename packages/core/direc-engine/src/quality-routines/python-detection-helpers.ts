import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { QualityRoutineDetectionContext } from "./types.js";
import { isNodeError } from "./helpers.js";

const textCache = new Map<string, Promise<string | null>>();

export async function hasRuffConfig(context: QualityRoutineDetectionContext): Promise<boolean> {
  return (
    (await hasPyprojectSection(context, "[tool.ruff")) ||
    context.scan.pythonConfigPaths.includes("ruff.toml")
  );
}

export async function hasPyprojectSection(
  context: QualityRoutineDetectionContext,
  header: string,
): Promise<boolean> {
  const pyprojectPath = resolve(context.repositoryRoot, "pyproject.toml");
  const contents = await readCachedText(pyprojectPath);
  return contents?.includes(header) ?? false;
}

function readCachedText(path: string): Promise<string | null> {
  const existing = textCache.get(path);

  if (existing) {
    return existing;
  }

  const pending = readFile(path, "utf8").catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  });

  textCache.set(path, pending);
  return pending;
}
