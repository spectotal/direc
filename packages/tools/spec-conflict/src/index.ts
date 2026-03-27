import { readFile } from "node:fs/promises";
import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";

export const specConflictNode: AnalysisNode = {
  id: "spec-conflict",
  displayName: "Spec Conflict",
  selector: {
    anyOf: ["source.openspec.spec-change"],
  },
  produces: ["evaluation.spec-conflict"],
  detect(context) {
    return context.hasOpenSpec;
  },
  async run(context) {
    const conflicts: Array<{
      changeId: string;
      changeSpecPath: string;
      stableSpecPath: string;
      reason: string;
    }> = [];
    let comparedCount = 0;

    for (const artifact of context.inputArtifacts) {
      const payload = artifact.payload as {
        changeId: string;
        changeSpecPath: string;
        stableSpecPath: string;
      };

      const changeContents = normaliseSpec(await readFile(payload.changeSpecPath, "utf8"));
      let stableContents = "";
      try {
        stableContents = normaliseSpec(await readFile(payload.stableSpecPath, "utf8"));
      } catch {
        continue;
      }

      comparedCount += 1;
      if (changeContents !== stableContents) {
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
        },
      },
    ];
  },
};

function normaliseSpec(contents: string): string {
  return contents
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}
