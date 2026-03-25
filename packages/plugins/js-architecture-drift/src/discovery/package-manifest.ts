import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface PackageManifest {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
}

export async function readJsonFile(path: string): Promise<PackageManifest | null> {
  if (!existsSync(path)) return null;
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as PackageManifest;
  } catch {
    return null;
  }
}

export function getWorkspacesFromManifest(manifest: PackageManifest | null): string[] {
  const workspaces = manifest?.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (Array.isArray(workspaces?.packages)) return workspaces.packages;
  return [];
}
