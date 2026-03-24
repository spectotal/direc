import { extname } from "node:path";
import {
  DEFAULT_ANALYZER_EXCLUDE_PATTERNS,
  filterPathsWithPatterns,
} from "@spectotal/direc-analysis-runtime";
import { NODE_SOURCE_EXTENSIONS } from "./constants.js";
import type { PackageManifest } from "./types.js";

export function normalizeWorkspaces(workspaces: PackageManifest["workspaces"]): string[] {
  if (!workspaces) {
    return [];
  }

  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  return workspaces.packages ?? [];
}

export function findSourcePathsForRoot(files: string[], root: string): string[] {
  const matchesRoot =
    root === "."
      ? (file: string) => NODE_SOURCE_EXTENSIONS.has(extname(file))
      : (file: string) => file.startsWith(`${root}/`) && NODE_SOURCE_EXTENSIONS.has(extname(file));

  return filterPathsWithPatterns(files.filter(matchesRoot), DEFAULT_ANALYZER_EXCLUDE_PATTERNS);
}

export function dedupeBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
