declare module "@spectotal/direc-skills-manager" {
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

  export interface SkillBundleRecord {
    provider: SkillProviderId;
    skillId: string;
    bundlePath: string;
    installedPath?: string;
  }

  export interface SyncSkillsResult {
    bundles: SkillBundleRecord[];
  }

  export function syncSkills(options: {
    repositoryRoot: string;
    config: SkillsConfig;
    now?: () => Date;
  }): Promise<SyncSkillsResult>;
}
