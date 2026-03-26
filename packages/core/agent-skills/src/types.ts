export const SUPPORTED_AGENTS = ["codex", "claude", "antigravity"] as const;

export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

type BundleArtifactPaths = Record<
  SupportedAgent,
  {
    commandPath: string;
    skillPath: string;
  }
>;

export const DIREC_BOUND_BUNDLE = {
  id: "direc-bound",
  commandName: "direc-bound",
  skillName: "direc-bound-architecture",
  templateDirectory: "direc-bound",
  description: "Synchronize architectural boundaries with current codebase state.",
  nextStepNotice: "call /direc-bound at your ai agent",
  artifactPaths: {
    antigravity: {
      commandPath: ".agent/workflows/direc-bound.md",
      skillPath: ".agent/skills/direc-bound-architecture/SKILL.md",
    },
    claude: {
      commandPath: ".claude/commands/direc-bound.md",
      skillPath: ".claude/skills/direc-bound-architecture/SKILL.md",
    },
    codex: {
      commandPath: ".codex/prompts/direc-bound.md",
      skillPath: ".codex/skills/direc-bound-architecture/SKILL.md",
    },
  } as BundleArtifactPaths,
} as const;

export const SCAFFOLD_BUNDLE_IDS = [DIREC_BOUND_BUNDLE.id] as const;

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
