import { readFileSync, existsSync } from "node:fs";
import { resolve as resolvePath, relative as relativePath } from "node:path";
import ts from "typescript";

export function resolveDependencies(
  targetPath: string,
  repositoryRoot: string,
  compilerOptions: ts.CompilerOptions,
  host: ts.CompilerHost,
): string[] {
  const absolutePath = resolvePath(repositoryRoot, targetPath);
  if (!existsSync(absolutePath)) return [];

  const sourceText = readFileSync(absolutePath, "utf8");
  const preProcessedInfo = ts.preProcessFile(sourceText, true, true);

  return preProcessedInfo.importedFiles
    .map((imported) => ts.resolveModuleName(imported.fileName, absolutePath, compilerOptions, host))
    .filter((resolved) => {
      if (!resolved.resolvedModule) return false;
      if (resolved.resolvedModule.isExternalLibraryImport) return false;

      const fileName = resolved.resolvedModule.resolvedFileName;
      const isInternal = !fileName.includes("node_modules") || fileName.startsWith(repositoryRoot);

      return isInternal;
    })
    .map((resolved) =>
      relativePath(repositoryRoot, resolved.resolvedModule!.resolvedFileName).replace(/\\/g, "/"),
    );
}
