import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseSource } from "../ast/parser.js";
import { DEFAULT_TRAVERSAL_CONTEXT } from "../ast/traversal-context.js";
import { traverse } from "../ast/traversal.js";
import { createMetricAccumulator } from "../metrics/accumulator.js";
import { calculateHalsteadMetrics, calculateMaintainability } from "../metrics/halstead.js";

export async function runComplexityTool(options: {
  repositoryRoot: string;
  sourcePaths: string[];
}): Promise<{
  metrics: Array<{
    path: string;
    cyclomatic: number;
    logicalSloc: number;
    maintainability: number;
  }>;
  skippedFiles: Array<{
    path: string;
    message: string;
  }>;
}> {
  const metrics: Array<{
    path: string;
    cyclomatic: number;
    logicalSloc: number;
    maintainability: number;
  }> = [];
  const skippedFiles: Array<{
    path: string;
    message: string;
  }> = [];

  for (const sourcePath of options.sourcePaths) {
    try {
      const absolutePath = resolve(options.repositoryRoot, sourcePath);
      const source = await readFile(absolutePath, "utf8");
      const analysis = analyzeSource(source, absolutePath);

      metrics.push({
        path: sourcePath,
        cyclomatic: analysis.cyclomatic,
        logicalSloc: analysis.logicalSloc,
        maintainability: analysis.maintainability,
      });
    } catch (error) {
      skippedFiles.push({
        path: sourcePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    metrics,
    skippedFiles,
  };
}

export function analyzeSource(
  source: string,
  filePath: string,
): {
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
} {
  const program = parseSource(source, filePath);
  const accumulator = createMetricAccumulator();

  traverse(program, null, accumulator, DEFAULT_TRAVERSAL_CONTEXT);

  return {
    cyclomatic: accumulator.cyclomatic,
    logicalSloc: accumulator.logicalSloc,
    maintainability: calculateMaintainability({
      cyclomatic: accumulator.cyclomatic,
      halstead: calculateHalsteadMetrics(accumulator),
      logicalSloc: accumulator.logicalSloc,
      methodCount: accumulator.methodCount,
    }),
  };
}
