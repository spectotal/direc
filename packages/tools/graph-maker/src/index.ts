import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import { collectScopedPaths, normalisePaths } from "@spectotal/direc-artifact-contracts";

const JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export const graphMakerNode: AnalysisNode = {
  id: "graph-maker",
  displayName: "Graph Maker",
  selector: {
    anyOf: ["source.diff.scope", "source.openspec.task"],
  },
  produces: ["structural.graph"],
  detect(context) {
    return context.facets.some((facet) => facet.id === "js");
  },
  async run(context) {
    const scopedPaths = collectScopedPaths(context.inputArtifacts).filter(isJsPath);
    const sourcePaths =
      scopedPaths.length > 0 ? scopedPaths : context.projectContext.sourceFiles.filter(isJsPath);
    const nodes = normalisePaths(sourcePaths);
    const nodeSet = new Set(nodes);
    const edges: Array<{ from: string; to: string }> = [];

    for (const path of nodes) {
      const contents = await readFile(path, "utf8");
      const specifiers = [
        ...contents.matchAll(/(?:import|export)\s.+?from\s+["'](?<specifier>[^"']+)["']/gu),
        ...contents.matchAll(/require\(\s*["'](?<specifier>[^"']+)["']\s*\)/gu),
      ]
        .map((match) => match.groups?.specifier)
        .filter((value): value is string => Boolean(value));

      for (const specifier of specifiers) {
        if (!specifier.startsWith(".")) {
          continue;
        }

        const resolvedImport = await resolveImportPath(dirname(path), specifier);
        if (resolvedImport && nodeSet.has(resolvedImport)) {
          edges.push({
            from: path,
            to: resolvedImport,
          });
        }
      }
    }

    return [
      {
        type: "structural.graph",
        scope: {
          kind: "paths",
          paths: nodes,
        },
        payload: {
          nodes,
          edges,
        },
      },
    ];
  },
};

function isJsPath(path: string): boolean {
  return JS_EXTENSIONS.includes(extname(path));
}

async function resolveImportPath(fromDirectory: string, specifier: string): Promise<string | null> {
  const basePath = resolve(fromDirectory, specifier);
  const candidates = [
    basePath,
    ...JS_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...JS_EXTENSIONS.map((extension) => resolve(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}
