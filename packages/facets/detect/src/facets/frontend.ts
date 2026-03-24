import type { DetectedFacet } from "direc-analysis-runtime";
import { FRONTEND_DEPENDENCIES } from "../constants.js";
import type { RepositoryScan } from "../types.js";
import { compactEvidence, describeRoots } from "../utils.js";

export function detectFrontendFacet(scan: RepositoryScan): DetectedFacet | null {
  const frontendPackages = scan.packageManifests
    .filter(({ manifest }) =>
      [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ].some((dependency) => FRONTEND_DEPENDENCIES.has(dependency)),
    )
    .map(({ boundary }) => boundary.root);
  const frontendSourceRoots = scan.analyzableNodeSourcePaths.filter((file) =>
    /(app|components|pages|routes|ui)\//.test(file),
  );

  if (frontendPackages.length === 0 && frontendSourceRoots.length === 0) {
    return null;
  }

  return {
    id: "frontend",
    confidence: frontendPackages.length > 0 ? "high" : "medium",
    evidence: compactEvidence([
      frontendPackages.length > 0
        ? `Frontend framework dependencies found in: ${frontendPackages.join(", ")}.`
        : null,
      frontendSourceRoots.length > 0
        ? `Frontend-oriented source layout detected in ${describeRoots(frontendSourceRoots)}.`
        : null,
    ]),
    metadata: {
      packageRoots: frontendPackages,
      frameworkDependencies: [...scan.dependencyNames].filter((dependency) =>
        FRONTEND_DEPENDENCIES.has(dependency),
      ),
      sourcePaths: frontendSourceRoots,
    },
  };
}
