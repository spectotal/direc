import { createInterface } from "node:readline/promises";
import { getSupportedAgents, type SupportedAgent } from "@spectotal/direc-agent-skills";

export type InitAgentDependencies = {
  stdin?: {
    isTTY?: boolean;
  };
  stdout?: {
    isTTY?: boolean;
    write(chunk: string | Uint8Array, ...args: unknown[]): boolean;
  };
  selectAgents?: () => Promise<string[] | SupportedAgent[]>;
};

export async function resolveSelectedAgents(
  optionAgents: string[] | undefined,
  dependencies: InitAgentDependencies = {},
): Promise<SupportedAgent[]> {
  if (optionAgents && optionAgents.length > 0) {
    return normalizeSelectedAgents(optionAgents);
  }

  const stdin = dependencies.stdin ?? process.stdin;
  const stdout = dependencies.stdout ?? process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      "No agents selected. Re-run `direc init --agent <name>` or use an interactive terminal.",
    );
  }

  const selectedAgents = dependencies.selectAgents
    ? await dependencies.selectAgents()
    : await promptForAgents();

  return normalizeSelectedAgents(selectedAgents);
}

export function normalizeSelectedAgents(values: readonly string[]): SupportedAgent[] {
  const supportedAgents = getSupportedAgents();
  const supportedAgentSet = new Set(supportedAgents);
  const normalizedValues = values.map((value) => value.trim().toLowerCase()).filter(Boolean);

  if (normalizedValues.length === 0) {
    throw new Error("At least one agent must be selected.");
  }

  for (const value of normalizedValues) {
    if (!supportedAgentSet.has(value as SupportedAgent)) {
      throw new Error(
        `Unsupported agent: ${value}. Expected one of: ${supportedAgents.join(", ")}.`,
      );
    }
  }

  const selectedAgents = new Set(normalizedValues as SupportedAgent[]);
  return supportedAgents.filter((agent) => selectedAgents.has(agent));
}

export function parseAgentSelection(input: string): SupportedAgent[] {
  const supportedAgents = getSupportedAgents();
  const normalizedInput = input.trim().toLowerCase();

  if (normalizedInput.length === 0) {
    throw new Error("Enter at least one agent name or number.");
  }

  const tokens = normalizedInput.split(/[\s,]+/u).filter(Boolean);
  const selectedAgents = new Set<SupportedAgent>();

  for (const token of tokens) {
    const parsedIndex = Number.parseInt(token, 10);

    if (Number.isInteger(parsedIndex) && `${parsedIndex}` === token) {
      const agent = supportedAgents[parsedIndex - 1];

      if (!agent) {
        throw new Error(`Unsupported agent selection: ${token}.`);
      }

      selectedAgents.add(agent);
      continue;
    }

    if (!supportedAgents.includes(token as SupportedAgent)) {
      throw new Error(`Unsupported agent selection: ${token}.`);
    }

    selectedAgents.add(token as SupportedAgent);
  }

  return supportedAgents.filter((agent) => selectedAgents.has(agent));
}

async function promptForAgents(): Promise<SupportedAgent[]> {
  const supportedAgents = getSupportedAgents();
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    process.stdout.write("Select agents to scaffold for repo-local Direc skills:\n");
    supportedAgents.forEach((agent, index) => {
      process.stdout.write(`  ${index + 1}. ${agent}\n`);
    });

    while (true) {
      const answer = await readline.question(
        "Enter one or more comma-separated numbers or names: ",
      );

      try {
        return parseAgentSelection(answer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(`${message}\n`);
      }
    }
  } finally {
    readline.close();
  }
}
