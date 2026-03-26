export const SUPPORTED_AGENTS = ["codex", "claude", "antigravity"] as const;

export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

export const SCAFFOLD_BUNDLE_IDS = ["direc-bound"] as const;

export type ScaffoldBundleId = (typeof SCAFFOLD_BUNDLE_IDS)[number];

export type ScaffoldRequest = {
  repositoryRoot: string;
  agents: SupportedAgent[];
  bundles?: ScaffoldBundleId[];
  force?: boolean;
};

export type ScaffoldedArtifact = {
  agent: SupportedAgent;
  bundleId: ScaffoldBundleId;
  path: string;
};
