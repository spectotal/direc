import { createInterface } from "node:readline/promises";
import {
  DEFAULT_CODEX_SKILLS_INSTALL_TARGET,
  SUPPORTED_SKILL_PROVIDERS,
  type InitCommandOptions,
} from "../types.js";
import {
  createCodexProviderConfig,
  createOptionalInstallProviderConfig,
  parseProviderList,
} from "./providers.js";

export function createPromptSession(): {
  prompt: (question: string) => Promise<string>;
  close: () => void;
} {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    prompt: (question: string) => rl.question(question),
    close: () => rl.close(),
  };
}

export async function promptForProviders(
  prompt: NonNullable<InitCommandOptions["prompt"]>,
): Promise<ReturnType<typeof parseProviderList>> {
  while (true) {
    const answer = await prompt(
      `providers (comma-separated: ${SUPPORTED_SKILL_PROVIDERS.join(", ")}): `,
    );
    const providers = parseProviderList(answer);
    if (providers.length > 0) {
      return providers;
    }
  }
}

export async function promptForProviderConfig(
  provider: ReturnType<typeof parseProviderList>[number],
  prompt: NonNullable<InitCommandOptions["prompt"]>,
) {
  if (provider === "codex") {
    const answer = await prompt(
      `install target for codex [${DEFAULT_CODEX_SKILLS_INSTALL_TARGET}]: `,
    );
    return createCodexProviderConfig(answer.trim() || DEFAULT_CODEX_SKILLS_INSTALL_TARGET);
  }

  const answer = await prompt(`install target for ${provider} (leave blank for bundle-only): `);
  const installTarget = answer.trim();
  return createOptionalInstallProviderConfig(provider, installTarget || undefined);
}
