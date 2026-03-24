import { basename, extname, join, resolve } from "node:path";
import { DEFAULT_ANALYZER_EXCLUDE_PATTERNS, filterPathsWithPatterns } from "direc-analysis-runtime";
import {
  CSS_EXTENSIONS,
  NODE_SOURCE_EXTENSIONS,
  PYTHON_CONFIG_FILENAMES,
  PYTHON_SOURCE_EXTENSIONS,
} from "./constants.js";
import { readJsonFile, walkRepository } from "./filesystem.js";
import type { PackageManifest, RepositoryScan } from "./types.js";
import { collectPackageBoundaries } from "./workspace.js";

export async function scanRepository(repositoryRoot: string): Promise<RepositoryScan> {
  const root = resolve(repositoryRoot);
  const files = await walkRepository(root);
  const packageBoundaries = await collectPackageBoundaries(root, files);
  const packageManifests = await Promise.all(
    packageBoundaries.map(async (boundary) => ({
      boundary,
      manifest:
        (await readJsonFile<PackageManifest>(join(root, boundary.root, "package.json"))) ?? {},
    })),
  );
  const dependencyNames = new Set(
    packageManifests.flatMap(({ manifest }) => [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]),
  );
  const tsconfigPaths = files.filter((file) => basename(file).startsWith("tsconfig"));
  const nodeSourcePaths = files.filter((file) => NODE_SOURCE_EXTENSIONS.has(extname(file)));
  const analyzableNodeSourcePaths = filterPathsWithPatterns(
    nodeSourcePaths,
    DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  );
  const cssPaths = files.filter((file) => CSS_EXTENSIONS.has(extname(file)));
  const tailwindConfigPaths = files.filter((file) => /^tailwind\.config\./.test(basename(file)));
  const pythonSourcePaths = files.filter((file) => PYTHON_SOURCE_EXTENSIONS.has(extname(file)));
  const analyzablePythonSourcePaths = filterPathsWithPatterns(
    pythonSourcePaths,
    DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  );
  const pythonConfigPaths = files.filter((file) => PYTHON_CONFIG_FILENAMES.has(basename(file)));

  return {
    root,
    files,
    packageBoundaries,
    packageManifests,
    dependencyNames,
    tsconfigPaths,
    nodeSourcePaths,
    analyzableNodeSourcePaths,
    cssPaths,
    tailwindConfigPaths,
    pythonSourcePaths,
    analyzablePythonSourcePaths,
    pythonConfigPaths,
  };
}
