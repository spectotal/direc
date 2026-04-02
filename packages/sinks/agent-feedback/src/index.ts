import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FeedbackSink } from "@spectotal/direc-feedback-contracts";

export const agentFeedbackSink: FeedbackSink = {
  id: "agent-feedback",
  displayName: "Agent Feedback",
  subscribedArtifactTypes: ["evaluation.complexity-findings"],
  detect: () => true,
  async deliver(context) {
    const outputPath = "deliveries/agent-feedback.json";
    const payload = {
      runId: context.runId,
      pipelineId: context.pipelineId,
      sinkId: context.sinkConfig.id,
      artifacts: context.artifacts,
    };

    await Promise.all([
      writeDeliveryFile(context.runDirectory, outputPath, payload),
      writeDeliveryFile(context.latestDirectory, outputPath, payload),
    ]);

    return {
      outputPath,
    };
  },
};

async function writeDeliveryFile(
  directory: string,
  outputPath: string,
  payload: unknown,
): Promise<void> {
  const filePath = join(directory, outputPath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
