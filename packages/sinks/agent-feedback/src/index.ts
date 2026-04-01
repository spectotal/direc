import type { FeedbackSink } from "@spectotal/direc-feedback-contracts";

export const agentFeedbackSink: FeedbackSink = {
  id: "agent-feedback",
  displayName: "Agent Feedback",
  subscribedArtifactTypes: ["evaluation.complexity-findings"],
  detect: () => true,
  async deliver() {},
};
