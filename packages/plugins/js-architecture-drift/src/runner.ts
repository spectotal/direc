import { resolve } from "node:path";
import type { ArchitectureToolResult } from "./types.js";

export async function runArchitectureTool(options: {
  repositoryRoot: string;
  targetPaths: string[];
  tsConfigPath?: string;
}): Promise<ArchitectureToolResult> {
  const { default: madge } = (await import("madge")) as {
    default: (
      path: string | string[],
      config: Record<string, unknown>,
    ) => Promise<{
      obj(): Record<string, string[]>;
      circular(): Array<string | string[]>;
    }>;
  };

  const tsConfig = options.tsConfigPath
    ? resolve(options.repositoryRoot, options.tsConfigPath)
    : undefined;
  const result = await madge(
    options.targetPaths.map((targetPath) => resolve(options.repositoryRoot, targetPath)),
    {
      baseDir: options.repositoryRoot,
      fileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
      includeNpm: false,
      tsConfig,
    },
  );

  return {
    graph: result.obj(),
    circular: result.circular().map((entry) => (Array.isArray(entry) ? entry : [entry])),
  };
}
