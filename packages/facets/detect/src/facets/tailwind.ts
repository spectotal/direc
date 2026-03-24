import type { DetectedFacet } from "@spectotal/direc-analysis-runtime";
import type { RepositoryScan } from "../types.js";
import { compactEvidence } from "../utils.js";

export function detectTailwindFacet(scan: RepositoryScan): DetectedFacet | null {
  const hasTailwindDependency = scan.dependencyNames.has("tailwindcss");
  if (scan.tailwindConfigPaths.length === 0 && !hasTailwindDependency) {
    return null;
  }

  return {
    id: "tailwind",
    confidence: scan.tailwindConfigPaths.length > 0 ? "high" : "medium",
    evidence: compactEvidence([
      scan.tailwindConfigPaths.length > 0
        ? `Found Tailwind configuration files: ${scan.tailwindConfigPaths.join(", ")}.`
        : null,
      hasTailwindDependency ? "Detected tailwindcss dependency in package manifests." : null,
    ]),
    metadata: {
      configPaths: scan.tailwindConfigPaths,
      packageRoots: scan.packageManifests
        .filter(({ manifest }) =>
          Object.keys({
            ...(manifest.dependencies ?? {}),
            ...(manifest.devDependencies ?? {}),
          }).includes("tailwindcss"),
        )
        .map(({ boundary }) => boundary.root),
    },
  };
}
