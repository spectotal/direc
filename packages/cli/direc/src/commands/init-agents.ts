import { cancel, isCancel, multiselect } from "@clack/prompts";
import { getSupportedAgents, type SupportedAgent } from "@spectotal/direc-agent-skills";
import { createAgentPromptOptions } from "../ui/init/agent-select.js";

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

export class InitCancelledError extends Error {
  constructor(message = "Initialization cancelled.") {
    super(message);
    this.name = "InitCancelledError";
  }
}

export function isInitCancelledError(error: unknown): error is InitCancelledError {
  return error instanceof InitCancelledError;
}

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

async function promptForAgents(): Promise<SupportedAgent[]> {
  const supportedAgents = getSupportedAgents();

  const selectedAgents = await multiselect(createAgentPromptOptions(supportedAgents));

  if (isCancel(selectedAgents)) {
    cancel("Initialization cancelled.");
    throw new InitCancelledError();
  }

  return normalizeSelectedAgents(selectedAgents.map((agent) => String(agent)));
}
