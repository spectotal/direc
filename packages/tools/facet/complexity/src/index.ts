import { access, readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import { collectScopedPaths, normalisePaths } from "@spectotal/direc-artifact-contracts";
import type { ComplexityArtifactPayload, ComplexityFileMetric } from "./contracts.js";

export type { ComplexityArtifactPayload, ComplexityFileMetric } from "./contracts.js";

const JS_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

export const complexityNode: AnalysisNode<{
  warningThreshold?: number;
  errorThreshold?: number;
}> = {
  id: "complexity",
  displayName: "Complexity",
  stage: "extractor",
  binding: "facet-bound",
  requires: {
    anyOf: ["source.diff.scope", "source.openspec.task"],
  },
  requiredFacets: ["js"],
  produces: ["metric.complexity"],
  detect(context) {
    return context.facets.some((facet) => facet.id === "js");
  },
  async run(context) {
    const scopedPaths = collectScopedPaths(context.inputArtifacts).filter(isJsPath);
    const sourcePaths =
      scopedPaths.length > 0 ? scopedPaths : context.projectContext.sourceFiles.filter(isJsPath);
    const warningThreshold = asNumber(context.options.warningThreshold, 10);
    const errorThreshold = asNumber(context.options.errorThreshold, 20);
    const files: ComplexityFileMetric[] = [];
    let warningCount = 0;
    let errorCount = 0;

    for (const path of normalisePaths(sourcePaths)) {
      if (!(await pathExists(path))) {
        continue;
      }
      const contents = await readFile(path, "utf8");
      const cyclomatic = estimateCyclomaticComplexity(contents);
      if (cyclomatic >= errorThreshold) {
        errorCount += 1;
      } else if (cyclomatic >= warningThreshold) {
        warningCount += 1;
      }

      files.push({
        path,
        cyclomatic,
      });
    }

    return [
      {
        type: "metric.complexity",
        scope: {
          kind: "paths",
          paths: sourcePaths,
        },
        payload: {
          paths: sourcePaths,
          files,
          warningThreshold,
          errorThreshold,
          warningCount,
          errorCount,
          maxCyclomatic: files.reduce((max, entry) => Math.max(max, entry.cyclomatic), 0),
        } satisfies ComplexityArtifactPayload,
      },
    ];
  },
};

function estimateCyclomaticComplexity(contents: string): number {
  const matches = contents.match(/\b(if|for|while|catch|case|switch)\b|&&|\|\||\?/gu) ?? [];
  return 1 + matches.length;
}

function isJsPath(path: string): boolean {
  return JS_EXTENSIONS.has(extname(path));
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
