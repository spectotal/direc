import type { DetectedFacet, QualityRoutineConfig } from "direc-analysis-runtime";
import type { RepositoryScan } from "direc-facet-detect";
import type { QualityRoutineAdapter } from "./types.js";

export async function detectQualityRoutines(options: {
  repositoryRoot: string;
  scan: RepositoryScan;
  detectedFacets: DetectedFacet[];
  adapters: QualityRoutineAdapter[];
}): Promise<Record<string, QualityRoutineConfig>> {
  const rootManifestEntry = options.scan.packageManifests.find(
    ({ boundary }) => boundary.root === ".",
  );
  const routines = await Promise.all(
    options.adapters.map(async (adapter) => {
      const config = await adapter.detect?.({
        repositoryRoot: options.repositoryRoot,
        scan: options.scan,
        detectedFacets: options.detectedFacets,
        rootManifest: rootManifestEntry?.manifest ?? null,
      });

      return config ? ([adapter.id, config] as const) : null;
    }),
  );

  return Object.fromEntries(
    routines.filter((entry): entry is [string, QualityRoutineConfig] => entry !== null),
  );
}
