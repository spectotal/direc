import { readFile } from "node:fs/promises";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { SpecDocumentPairArtifactPayload } from "./contracts.js";

export type { SpecDocumentPairArtifactPayload } from "./contracts.js";

export const specDocumentsNode: AnalysisNode = {
  id: "spec-documents",
  displayName: "Spec Documents",
  binding: "facet",
  requires: {
    anyOf: ["source.openspec.spec-change"],
  },
  requiredFacets: ["openspec"],
  produces: ["analysis.spec-document-pair"],
  detect(context) {
    return context.hasOpenSpec;
  },
  async run(context) {
    return await Promise.all(
      context.inputArtifacts.map(async (artifact) => {
        const payload = artifact.payload as {
          changeId: string;
          changeSpecPath: string;
          stableSpecPath: string;
        };

        let stableContents: string | null = null;
        try {
          stableContents = normaliseSpec(await readFile(payload.stableSpecPath, "utf8"));
        } catch {
          stableContents = null;
        }

        return {
          type: "analysis.spec-document-pair",
          scope: artifact.scope,
          payload: {
            changeId: payload.changeId,
            changeSpecPath: payload.changeSpecPath,
            stableSpecPath: payload.stableSpecPath,
            changeContents: normaliseSpec(await readFile(payload.changeSpecPath, "utf8")),
            stableContents,
          } satisfies SpecDocumentPairArtifactPayload,
        };
      }),
    );
  },
};

function normaliseSpec(contents: string): string {
  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}
