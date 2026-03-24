import type { DetectedFacet } from "direc-analysis-runtime";

export type PackageManifest = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type PackageBoundary = {
  name: string;
  root: string;
  sourcePaths: string[];
};

export type PackageManifestEntry = {
  boundary: PackageBoundary;
  manifest: PackageManifest;
};

export type RepositoryScan = {
  root: string;
  files: string[];
  packageBoundaries: PackageBoundary[];
  packageManifests: PackageManifestEntry[];
  dependencyNames: Set<string>;
  tsconfigPaths: string[];
  nodeSourcePaths: string[];
  analyzableNodeSourcePaths: string[];
  cssPaths: string[];
  tailwindConfigPaths: string[];
  pythonSourcePaths: string[];
  analyzablePythonSourcePaths: string[];
  pythonConfigPaths: string[];
};

export type FacetDetector = (scan: RepositoryScan) => DetectedFacet | null;
