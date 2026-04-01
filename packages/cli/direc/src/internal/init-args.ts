import type { InitArgOptions } from "./types.js";
import { parseAgentSelection } from "./skills/agents.js";

export function parseInitArgs(args: string[]): InitArgOptions {
  let agents: NonNullable<InitArgOptions["agents"]> | undefined;
  const seenAgents = new Set<NonNullable<InitArgOptions["agents"]>[number]>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }

    const [flag, inlineValue] = argument.split("=", 2);
    const value = readFlagValue(args, index, inlineValue);
    if (inlineValue === undefined && value !== undefined) {
      index += 1;
    }

    switch (flag) {
      case "--agent":
        if (!value) {
          throw new Error("--agent requires an agent id.");
        }
        const agent = parseAgentSelection(value);
        if (seenAgents.has(agent)) {
          throw new Error(`Duplicate --agent entry for ${agent}.`);
        }
        seenAgents.add(agent);
        agents ??= [];
        agents.push(agent);
        break;
      default:
        throw new Error(`Unknown init option: ${argument}`);
    }
  }

  return {
    agents,
  };
}

function readFlagValue(
  args: string[],
  index: number,
  inlineValue: string | undefined,
): string | undefined {
  return inlineValue ?? args[index + 1];
}
