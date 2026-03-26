import { readFileSync, existsSync } from "node:fs";
import { resolve as resolvePath, relative as relativePath, join } from "node:path";
import ts from "typescript";

function buildWorkspaceIndex(
  packageBoundaries: Array<{ name?: string; root?: string }>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const { name, root } of packageBoundaries) {
    if (name && root) index.set(name, root);
  }
  return index;
}

function resolveWorkspaceImport(
  importName: string,
  workspaceIndex: Map<string, string>,
  repositoryRoot: string,
): string | null {
  for (const [pkgName, pkgRoot] of workspaceIndex) {
    if (importName !== pkgName && !importName.startsWith(pkgName + "/")) continue;
    const subPath = importName.slice(pkgName.length);
    const srcDir = join(repositoryRoot, pkgRoot, "src");
    const candidates = subPath
      ? [
          `${join(srcDir, subPath)}.ts`,
          `${join(srcDir, subPath)}.tsx`,
          join(srcDir, subPath, "index.ts"),
        ]
      : [join(srcDir, "index.ts"), join(srcDir, "index.tsx")];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }
  return null;
}

export function resolveDependencies(
  targetPath: string,
  repositoryRoot: string,
  compilerOptions: ts.CompilerOptions,
  host: ts.CompilerHost,
  packageBoundaries?: Array<{ name?: string; root?: string }>,
): string[] {
  const absolutePath = resolvePath(repositoryRoot, targetPath);
  if (!existsSync(absolutePath)) return [];

  const sourceText = readFileSync(absolutePath, "utf8");
  const preProcessedInfo = ts.preProcessFile(sourceText, true, true);
  const workspaceIndex = buildWorkspaceIndex(packageBoundaries ?? []);
  const results: string[] = [];

  for (const imported of preProcessedInfo.importedFiles) {
    // Resolve workspace package imports directly to their source, bypassing
    // TypeScript's node_modules resolution which marks them as external.
    const workspaceResolved = resolveWorkspaceImport(
      imported.fileName,
      workspaceIndex,
      repositoryRoot,
    );
    if (workspaceResolved !== null) {
      results.push(relativePath(repositoryRoot, workspaceResolved).replace(/\\/g, "/"));
      continue;
    }

    // Fall back to TypeScript resolution for non-workspace imports.
    const resolved = ts.resolveModuleName(imported.fileName, absolutePath, compilerOptions, host);
    if (!resolved.resolvedModule) continue;
    const fileName = resolved.resolvedModule.resolvedFileName;
    if (fileName.startsWith(repositoryRoot) && !fileName.includes("node_modules")) {
      results.push(relativePath(repositoryRoot, fileName).replace(/\\/g, "/"));
    }
  }

  return results;
}
