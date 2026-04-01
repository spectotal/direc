import type { SkillProviderId } from "@spectotal/direc-pipeline-manager";
import type { InitArgOptions } from "./types.js";
import { normalizeProviderId, parseProviderList } from "./skills/providers.js";

export function parseInitArgs(args: string[]): InitArgOptions {
  let providers: SkillProviderId[] | undefined;
  const installTargets: Partial<Record<SkillProviderId, string>> = {};

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
      case "--providers":
        if (!value) {
          throw new Error("--providers requires a comma-separated value.");
        }
        providers = parseProviderList(value);
        break;
      case "--install-target":
        if (!value) {
          throw new Error("--install-target requires provider=path.");
        }
        assignInstallTarget(installTargets, value);
        break;
      default:
        throw new Error(`Unknown init option: ${argument}`);
    }
  }

  return {
    providers,
    installTargets,
  };
}

function readFlagValue(
  args: string[],
  index: number,
  inlineValue: string | undefined,
): string | undefined {
  return inlineValue ?? args[index + 1];
}

function assignInstallTarget(
  installTargets: Partial<Record<SkillProviderId, string>>,
  value: string,
): void {
  const separator = value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error("--install-target requires provider=path.");
  }

  const provider = normalizeProviderId(value.slice(0, separator));
  installTargets[provider] = value.slice(separator + 1);
}
