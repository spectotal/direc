import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { QualityRoutineDetectionContext } from "./types.js";
import { isNodeError } from "./helpers.js";

export async function hasPythonTool(
  context: QualityRoutineDetectionContext,
  tool: string,
): Promise<boolean> {
  if (context.detectedFacets.every((facet) => facet.id !== "python")) {
    return false;
  }

  if (tool === "ruff" || tool === "ruff-format") {
    return hasRuffConfig(context);
  }

  if (tool === "black") {
    return hasPyprojectSection(context, "[tool.black");
  }

  if (tool === "mypy") {
    return (
      context.scan.pythonConfigPaths.includes("mypy.ini") ||
      (await hasPyprojectSection(context, "[tool.mypy"))
    );
  }

  if (tool === "pytest") {
    return (
      context.scan.pythonConfigPaths.includes("pytest.ini") ||
      (await hasPyprojectSection(context, "[tool.pytest")) ||
      (await hasPyprojectSection(context, "[tool.pytest.ini_options"))
    );
  }

  return false;
}

async function hasRuffConfig(context: QualityRoutineDetectionContext): Promise<boolean> {
  return (
    (await hasPyprojectSection(context, "[tool.ruff")) ||
    context.scan.pythonConfigPaths.includes("ruff.toml")
  );
}

async function hasPyprojectSection(
  context: QualityRoutineDetectionContext,
  header: string,
): Promise<boolean> {
  const pyprojectPath = resolve(context.repositoryRoot, "pyproject.toml");
  const contents = await readCachedText(pyprojectPath);
  return contents?.includes(header) ?? false;
}

const textCache = new Map<string, Promise<string | null>>();

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
