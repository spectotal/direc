import { extname, relative, resolve } from "node:path";
import { existsSync } from "node:fs";

export function resolveTargetPaths(
  repositoryRoot: string,
  pathScopeMode: "fallback" | "strict" | undefined,
  eventPaths: string[],
  packageBoundaries: Array<{ root?: string }>,
): string[] {
  const scopedSourcePaths = eventPaths
    .map((path) => relative(repositoryRoot, path))
    .filter((path) => [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extname(path)));

  if (scopedSourcePaths.length > 0) {
    return [...new Set(scopedSourcePaths)].sort();
  }

  if (pathScopeMode === "strict") {
    return [];
  }

  const roots = packageBoundaries
    .map((boundary) => boundary.root)
    .filter((root): root is string => Boolean(root))
    .filter((root) => root !== ".")
    .map((root) => {
      const srcPath = `${root}/src`;
      return existsSync(resolve(repositoryRoot, srcPath)) ? srcPath : root;
    });

  return roots.length > 0
    ? [...new Set(roots)].sort()
    : ["src", "."].filter((p) => existsSync(resolve(repositoryRoot, p)));
}

export function resolveTsConfigPath(
  tsConfigPaths: string[],
  explicitPath?: string,
): string | undefined {
  if (explicitPath) {
    return explicitPath;
  }

  return tsConfigPaths[0];
}
