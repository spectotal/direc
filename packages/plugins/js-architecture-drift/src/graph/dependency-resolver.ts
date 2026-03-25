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
    .filter(
      (resolved) =>
        resolved.resolvedModule &&
        !resolved.resolvedModule.isExternalLibraryImport &&
        !resolved.resolvedModule.resolvedFileName.includes("node_modules"),
    )
    .map((resolved) =>
      relativePath(repositoryRoot, resolved.resolvedModule!.resolvedFileName).replace(/\\/g, "/"),
    );
}
