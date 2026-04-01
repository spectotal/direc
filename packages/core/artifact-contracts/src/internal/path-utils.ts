import type { ArtifactEnvelope } from "../index.js";

export function normalisePaths(paths: string[]): string[] {
  return [...new Set(paths.filter((path) => path.length > 0))].sort();
}

export function collectScopedPaths(artifacts: ArtifactEnvelope[]): string[] {
  const paths = new Set<string>();

  for (const artifact of artifacts) {
    addPaths(paths, artifact.scope.paths);
    addPaths(paths, readPayloadPaths(artifact.payload));
  }

  return normalisePaths([...paths]);
}

function addPaths(target: Set<string>, paths: readonly string[] | undefined): void {
  for (const path of paths ?? []) {
    target.add(path);
  }
}

function readPayloadPaths(payload: unknown): string[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("paths" in payload) ||
    !Array.isArray((payload as { paths?: unknown }).paths)
  ) {
    return [];
  }

  return (payload as { paths: unknown[] }).paths.filter(
    (path): path is string => typeof path === "string",
  );
}
