import { resolve, relative, extname } from "node:path";
import { existsSync, statSync, readdirSync } from "node:fs";

export function getAllFiles(
  dirPath: string,
  repositoryRoot: string,
  arrayOfFiles: string[] = [],
): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    if (
      ["node_modules", "dist", "build", "coverage", ".direc", ".turbo"].includes(file) ||
      file.startsWith(".")
    )
      return;
    const absolutePath = resolve(dirPath, file);
    if (statSync(absolutePath).isDirectory()) {
      arrayOfFiles = getAllFiles(absolutePath, repositoryRoot, arrayOfFiles);
    } else {
      const ext = extname(file);
      if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
        arrayOfFiles.push(relative(repositoryRoot, absolutePath).replace(/\\/g, "/"));
      }
    }
  });

  return arrayOfFiles;
}

export function expandTargetPaths(repositoryRoot: string, targetPaths: string[]): string[] {
  const expanded = new Set<string>();
  for (const targetPath of targetPaths) {
    const absolutePath = resolve(repositoryRoot, targetPath);
    if (!existsSync(absolutePath)) continue;

    if (statSync(absolutePath).isDirectory()) {
      getAllFiles(absolutePath, repositoryRoot).forEach((f) => expanded.add(f));
    } else if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extname(absolutePath))) {
      expanded.add(relative(repositoryRoot, absolutePath).replace(/\\/g, "/"));
    }
  }
  return Array.from(expanded);
}
