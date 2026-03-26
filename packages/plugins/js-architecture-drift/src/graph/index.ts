import ts from "typescript";
import type { ArchitectureToolResult } from "@spectotal/direc-core-architecture-drift";
import { resolveCompilerOptions } from "./compiler-setup.js";
import { expandTargetPaths } from "./file-crawler.js";
import { resolveDependencies } from "./dependency-resolver.js";
import { findCycles } from "./cycle-detection.js";

export async function runArchitectureTool(options: {
  repositoryRoot: string;
  targetPaths: string[];
  tsConfigPath?: string;
  packageBoundaries?: Array<{ name?: string; root?: string }>;
}): Promise<ArchitectureToolResult> {
  const compilerOptions = resolveCompilerOptions(options);
  const host = ts.createCompilerHost(compilerOptions);
  const targetPaths = expandTargetPaths(options.repositoryRoot, options.targetPaths);

  const graph: Record<string, string[]> = {};
  for (const targetPath of targetPaths) {
    graph[targetPath] = Array.from(
      new Set(
        resolveDependencies(
          targetPath,
          options.repositoryRoot,
          compilerOptions,
          host,
          options.packageBoundaries,
        ),
      ),
    );
  }

  return { graph, circular: findCycles(graph) };
}
