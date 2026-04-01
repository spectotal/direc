import type {
  SkillProviderId,
  SkillsProviderWorkspaceConfig,
} from "@spectotal/direc-pipeline-manager";
import { DEFAULT_CODEX_SKILLS_INSTALL_TARGET } from "../types.js";

export function parseProviderList(value: string): SkillProviderId[] {
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(normalizeProviderId);

  return uniqueProviders(parsed);
}

export function buildProviderConfig(
  provider: SkillProviderId,
  installTargets: Partial<Record<SkillProviderId, string>>,
): SkillsProviderWorkspaceConfig {
  if (provider === "codex") {
    return createCodexProviderConfig(
      installTargets.codex?.trim() || DEFAULT_CODEX_SKILLS_INSTALL_TARGET,
    );
  }

  return createOptionalInstallProviderConfig(provider, installTargets[provider]?.trim());
}

export function createCodexProviderConfig(installTarget: string): SkillsProviderWorkspaceConfig {
  return {
    id: "codex",
    bundleDir: bundleDirForProvider("codex"),
    installTarget,
    installMode: "installed",
  };
}

export function createOptionalInstallProviderConfig(
  provider: Exclude<SkillProviderId, "codex">,
  installTarget: string | undefined,
): SkillsProviderWorkspaceConfig {
  return {
    id: provider,
    bundleDir: bundleDirForProvider(provider),
    installTarget: installTarget || undefined,
    installMode: installTarget ? "installed" : "bundle-only",
  };
}

function bundleDirForProvider(provider: SkillProviderId): string {
  return `.direc/skills/${provider}`;
}

export function normalizeProviderId(value: string): SkillProviderId {
  if (value === "codex" || value === "claude" || value === "antigravity") {
    return value;
  }

  throw new Error(`Unsupported skills provider: ${value}`);
}

function uniqueProviders(providers: SkillProviderId[]): SkillProviderId[] {
  return [...new Set(providers)];
}
