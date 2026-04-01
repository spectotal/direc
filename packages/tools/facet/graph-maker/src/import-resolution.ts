import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { GraphArtifactPayload } from "./contracts.js";
import { graphJsExtensions } from "./source-paths.js";

export async function collectGraphEdges(nodes: string[]): Promise<GraphArtifactPayload["edges"]> {
  const nodeSet = new Set(nodes);
  const edges: GraphArtifactPayload["edges"] = [];

  for (const path of nodes) {
    const specifiers = await readImportSpecifiers(path);

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

  return edges;
}

async function readImportSpecifiers(path: string): Promise<string[]> {
  const contents = await readFile(path, "utf8");

  return [
    ...contents.matchAll(/(?:import|export)\s.+?from\s+["'](?<specifier>[^"']+)["']/gu),
    ...contents.matchAll(/require\(\s*["'](?<specifier>[^"']+)["']\s*\)/gu),
  ]
    .map((match) => match.groups?.specifier)
    .filter((value): value is string => Boolean(value));
}

async function resolveImportPath(fromDirectory: string, specifier: string): Promise<string | null> {
  const basePath = resolve(fromDirectory, specifier);
  const extensions = graphJsExtensions();
  const candidates = [
    basePath,
    ...extensions.map((extension) => `${basePath}${extension}`),
    ...extensions.map((extension) => resolve(basePath, `index${extension}`)),
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
