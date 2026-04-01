export type SkillProviderId = "codex" | "claude" | "antigravity";
export type SkillsInstallMode = "installed" | "bundle-only";

export interface SkillsProviderConfig {
  id: SkillProviderId;
  bundleDir: string;
  installTarget?: string;
  installMode: SkillsInstallMode;
}

export interface SkillsConfig {
  providers: SkillsProviderConfig[];
}

export interface SkillDefinition {
  id: string;
  description: string;
  sourcePath: string;
  content: string;
  body: string;
  resourcesPath?: string;
}

export interface SkillBundleRecord {
  provider: SkillProviderId;
  skillId: string;
  bundlePath: string;
  installedPath?: string;
}

export interface SyncSkillsResult {
  bundles: SkillBundleRecord[];
}

export { loadSkillCatalog, validateSkillCatalog } from "./internal/catalog.js";
export { syncSkills } from "./internal/bundle.js";
