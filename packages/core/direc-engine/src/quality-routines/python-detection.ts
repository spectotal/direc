import type { QualityRoutineDetectionContext } from "./types.js";
import { hasPyprojectSection, hasRuffConfig } from "./python-detection-helpers.js";

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
