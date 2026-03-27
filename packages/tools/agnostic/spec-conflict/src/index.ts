import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import type { SpecDocumentPairArtifactPayload } from "@spectotal/direc-tool-spec-documents";
import type { SpecConflictArtifactPayload } from "./contracts.js";

export type { SpecConflictArtifactPayload, SpecConflictFinding } from "./contracts.js";

export const specConflictNode: AnalysisNode = {
  id: "spec-conflict",
  displayName: "Spec Conflict",
  stage: "evaluator",
  binding: "agnostic",
  requires: {
    allOf: ["analysis.spec-document-pair"],
  },
  produces: ["evaluation.spec-conflict"],
  detect: () => true,
  async run(context) {
    const conflicts: SpecConflictArtifactPayload["conflicts"] = [];
    let comparedCount = 0;

    for (const artifact of context.inputArtifacts) {
      const payload = artifact.payload as SpecDocumentPairArtifactPayload;
      if (payload.stableContents === null) {
        continue;
      }

      comparedCount += 1;
      if (payload.changeContents !== payload.stableContents) {
        conflicts.push({
          changeId: payload.changeId,
          changeSpecPath: payload.changeSpecPath,
          stableSpecPath: payload.stableSpecPath,
          reason: "change spec differs from stable spec text",
        });
      }
    }

    return [
      {
        type: "evaluation.spec-conflict",
        scope: {
          kind: "feedback",
        },
        payload: {
          comparedCount,
          conflictCount: conflicts.length,
          warningCount: conflicts.length,
          errorCount: 0,
          conflicts,
        } satisfies SpecConflictArtifactPayload,
      },
    ];
  },
};
