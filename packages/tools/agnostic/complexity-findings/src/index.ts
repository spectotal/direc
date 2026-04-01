import type { AnalysisNode } from "@spectotal/direc-analysis-contracts";
import { normalisePaths } from "@spectotal/direc-artifact-contracts";
import type {
  ComplexityArtifactPayload,
  ComplexityFileMetric,
} from "@spectotal/direc-tool-js-complexity";
import type { ComplexityFindingsArtifactPayload } from "./contracts.js";

export type { ComplexityFindingsArtifactPayload } from "./contracts.js";

export const complexityFindingsNode: AnalysisNode = {
  id: "complexity-findings",
  displayName: "Complexity Findings",
  binding: "agnostic",
  requires: {
    allOf: ["metric.complexity"],
  },
  produces: ["evaluation.complexity-findings"],
  detect: () => true,
  async run(context) {
    const complexity = context.inputArtifacts.find(
      (artifact) => artifact.type === "metric.complexity",
    )?.payload as ComplexityArtifactPayload | undefined;

    if (!complexity) {
      return [];
    }

    const warningFiles = selectWarningFiles(
      complexity.files,
      complexity.warningThreshold,
      complexity.errorThreshold,
    );
    const errorFiles = selectErrorFiles(complexity.files, complexity.errorThreshold);
    const skippedFiles = [...complexity.skippedFiles];
    const scopedPaths = normalisePaths([
      ...warningFiles.map((file) => file.path),
      ...errorFiles.map((file) => file.path),
      ...skippedFiles.map((file) => file.path),
    ]);

    return [
      {
        type: "evaluation.complexity-findings",
        scope: {
          kind: "paths",
          paths: scopedPaths,
        },
        payload: {
          warningThreshold: complexity.warningThreshold,
          errorThreshold: complexity.errorThreshold,
          warningFiles,
          errorFiles,
          skippedFiles,
          warningCount: warningFiles.length + skippedFiles.length,
          errorCount: errorFiles.length,
        } satisfies ComplexityFindingsArtifactPayload,
      },
    ];
  },
};

function selectWarningFiles(
  files: ComplexityFileMetric[],
  warningThreshold: number,
  errorThreshold: number,
): ComplexityFileMetric[] {
  return files.filter(
    (file) => file.cyclomatic >= warningThreshold && file.cyclomatic < errorThreshold,
  );
}

function selectErrorFiles(
  files: ComplexityFileMetric[],
  errorThreshold: number,
): ComplexityFileMetric[] {
  return files.filter((file) => file.cyclomatic >= errorThreshold);
}
