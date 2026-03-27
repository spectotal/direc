import type { FeedbackSink } from "@spectotal/direc-feedback-contracts";

export const consoleSink: FeedbackSink = {
  id: "console",
  displayName: "Console",
  subscribedArtifactTypes: ["feedback.notice", "feedback.verdict"],
  detect: () => true,
  async deliver(context) {
    for (const artifact of context.artifacts) {
      if (artifact.type === "feedback.notice") {
        const payload = artifact.payload as { severity?: string; summary?: string };
        process.stdout.write(
          `[notice:${payload.severity ?? "info"}] ${payload.summary ?? "feedback notice"}\n`,
        );
        continue;
      }

      if (artifact.type === "feedback.verdict") {
        const payload = artifact.payload as { verdict?: string; summary?: string };
        process.stdout.write(
          `[verdict:${payload.verdict ?? "inform"}] ${payload.summary ?? "feedback verdict"}\n`,
        );
      }
    }
  },
};
