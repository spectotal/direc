import type { ScaffoldBundleId, SupportedAgent } from "./types.js";

type RelativeArtifact = {
  agent: SupportedAgent;
  bundleId: ScaffoldBundleId;
  path: string;
  contents: string;
};

const DIREC_BOUND_BUNDLE_ID: ScaffoldBundleId = "direc-bound";
const DIREC_BOUND_DESCRIPTION = "Synchronize architectural boundaries with current codebase state.";
const DIREC_BOUND_SKILL_NAME = "direc-bound-architecture";

const DIREC_BOUND_COMMAND_BODY = [
  "Use this file when the user runs `/direc-bound` to synchronize architectural boundaries with the current codebase state.",
  "",
  "1. Ensure the latest analysis results are available:",
  "   ```bash",
  "   npx direc analyze",
  "   ```",
  "",
  `2. Follow the \`${DIREC_BOUND_SKILL_NAME}\` skill instructions to:`,
  "   - Identify unassigned modules and clustered roles.",
  "   - Refine dependency whitelists in `.direc/config.json`.",
  "   - Reduce configuration noise.",
  "",
  "3. Verify the sync by running analysis again:",
  "   ```bash",
  "   npx direc analyze",
  "   ```",
  "",
  "4. Summarize the changes to the user.",
].join("\n");

const DIREC_BOUND_SKILL_BODY = [
  "Generate or refine the architecture roles and rules in `.direc/config.json` by analyzing the current codebase structure and existing findings.",
  "",
  "**Context**:",
  "The `direc` architecture is defined in `.direc/config.json` through `moduleRoles` (mapping paths to roles) and `roleBoundaryRules` (defining allowed dependencies between roles). If the config is out of sync, `direc analyze` will report many `unassigned-module` or false `forbidden-role-dependency` findings.",
  "",
  "**Steps**",
  "",
  "1. **Map the Monorepo Structure**",
  "   - Use `list_dir` on `packages/` to understand the project components.",
  "   - Use `view_file` on `package.json` for major packages to understand their primary responsibilities.",
  "",
  "2. **Generate Analysis Snapshot**",
  "   - Execute `npx direc analyze` (or the local equivalent) to produce the latest `js-architecture-drift.json`.",
  "   - Read the metrics and findings from this JSON file.",
  "",
  "3. **Cluster Unassigned Modules**",
  "   - Identify all `unassigned-module` findings.",
  "   - Group them by directory (for example, files in `packages/core/telemetry`).",
  "   - Propose new `moduleRoles` for these clusters.",
  "",
  "4. **Synthesize Missing Rules**",
  "   - Analyze `forbidden-role-dependency` findings.",
  "   - If a dependency is valid, identify the missing role in the `onlyDependOnRoles` whitelist.",
  "   - Propose rule updates to include these valid dependencies.",
  "",
  "5. **Apply and Verify**",
  "   - Update `.direc/config.json` with the proposed roles and rules.",
  "   - Run `npx direc analyze` again.",
  '   - Verify that the violation count decreases and that only "true drifts" remain.',
  "",
  "**Output**",
  "",
  "Summarize the configuration refinement:",
  "- List of new `moduleRoles` added.",
  "- List of roles updated with new allowed dependencies.",
  "- Count of resolved false positives.",
  "- Summary of any remaining high-fidelity architectural drifts.",
].join("\n");

const AGENT_ARTIFACT_PATHS: Record<
  SupportedAgent,
  {
    commandPath: string;
    skillPath: string;
  }
> = {
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
};

export function renderDirecBoundArtifacts(agent: SupportedAgent): RelativeArtifact[] {
  const paths = AGENT_ARTIFACT_PATHS[agent];

  return [
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE_ID,
      path: paths.commandPath,
      contents: renderCommandArtifact(agent),
    },
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE_ID,
      path: paths.skillPath,
      contents: renderSkillArtifact(),
    },
  ];
}

function renderCommandArtifact(agent: SupportedAgent): string {
  switch (agent) {
    case "antigravity":
      return [
        "---",
        `description: ${DIREC_BOUND_DESCRIPTION}`,
        "---",
        "",
        DIREC_BOUND_COMMAND_BODY,
        "",
      ].join("\n");
    case "claude":
      return [
        "---",
        'name: "direc-bound"',
        `description: ${DIREC_BOUND_DESCRIPTION}`,
        "category: Workflow",
        "tags: [direc, architecture, boundaries]",
        "---",
        "",
        DIREC_BOUND_COMMAND_BODY,
        "",
      ].join("\n");
    case "codex":
      return [
        "---",
        `description: ${DIREC_BOUND_DESCRIPTION}`,
        "---",
        "",
        DIREC_BOUND_COMMAND_BODY,
        "",
      ].join("\n");
  }
}

function renderSkillArtifact(): string {
  return [
    "---",
    `name: ${DIREC_BOUND_SKILL_NAME}`,
    "description: Synchronize or bootstrap the `direc` architectural boundaries in `.direc/config.json` with the current state of the codebase. Use when there are many unassigned modules or restrictive rules causing false positives.",
    "license: MIT",
    "compatibility: Requires `direc` CLI to be functional.",
    "metadata:",
    '  version: "1.0"',
    "---",
    "",
    DIREC_BOUND_SKILL_BODY,
    "",
  ].join("\n");
}
