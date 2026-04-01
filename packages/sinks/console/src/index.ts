import type { FeedbackSink } from "@spectotal/direc-feedback-contracts";

export const consoleSink: FeedbackSink = {
  id: "console",
  displayName: "Console",
  subscribedArtifactTypes: [
    "evaluation.complexity-findings",
    "evaluation.bounds-distance",
    "evaluation.spec-conflict",
  ],
  detect: () => true,
  async deliver(context) {
    for (const artifact of context.artifacts) {
      if (artifact.type === "evaluation.complexity-findings") {
        const payload = artifact.payload as {
          warningFiles?: Array<{ path: string; cyclomatic: number }>;
          errorFiles?: Array<{ path: string; cyclomatic: number }>;
          skippedFiles?: Array<{ path: string; message: string }>;
        };

        for (const file of payload.errorFiles ?? []) {
          process.stdout.write(`[complexity:error] ${file.path} cyclomatic=${file.cyclomatic}\n`);
        }
        for (const file of payload.warningFiles ?? []) {
          process.stdout.write(`[complexity:warning] ${file.path} cyclomatic=${file.cyclomatic}\n`);
        }
        for (const file of payload.skippedFiles ?? []) {
          process.stdout.write(`[complexity:warning] ${file.path} ${file.message}\n`);
        }
        continue;
      }

      const payload = artifact.payload as {
        errorCount?: number;
        warningCount?: number;
        summary?: string;
        conflictCount?: number;
      };
      const summary = payload.summary ?? `${artifact.type} reported findings`;
      const warningCount = payload.warningCount ?? payload.conflictCount ?? 0;
      const errorCount = payload.errorCount ?? 0;
      process.stdout.write(
        `[finding:${artifact.type}] ${summary} (errors=${errorCount}, warnings=${warningCount})\n`,
      );
    }
  },
};
