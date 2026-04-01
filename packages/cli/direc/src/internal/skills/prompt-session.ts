import { checkbox } from "@inquirer/prompts";
import type { SkillsPromptSession } from "../types.js";

export function createPromptSession(): SkillsPromptSession {
  return {
    selectAgents: ({ agents }) =>
      checkbox({
        message: "Select agents",
        choices: agents.map((agent) => ({
          name: agent,
          value: agent,
        })),
        required: true,
      }),
    close: () => {},
  };
}
