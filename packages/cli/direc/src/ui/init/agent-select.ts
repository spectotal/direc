import type { MultiSelectOptions } from "@clack/prompts";
import type { SupportedAgent } from "@spectotal/direc-agent-skills";
import { brandText } from "../brand/tokens.js";

const AGENT_HINTS: Record<SupportedAgent, string> = {
  antigravity: ".agent workflow and skill files",
  claude: ".claude command and skill files",
  codex: ".codex prompt and skill files",
};

export function createAgentPromptOptions(
  supportedAgents: readonly SupportedAgent[],
): MultiSelectOptions<SupportedAgent> {
  return {
    message: [
      brandText.accent("Select agents to scaffold"),
      brandText.muted("Space toggles, Enter submits."),
    ].join("\n"),
    options: supportedAgents.map((agent) => ({
      value: agent,
      label: brandText.strong(agent),
      hint: AGENT_HINTS[agent],
    })),
    required: true,
  };
}
