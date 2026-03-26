import { readFileSync } from "node:fs";
import type { ScaffoldBundleId, SupportedAgent } from "./types.js";

type RelativeArtifact = {
  agent: SupportedAgent;
  bundleId: ScaffoldBundleId;
  path: string;
  contents: string;
};

const DIREC_BOUND_BUNDLE_ID: ScaffoldBundleId = "direc-bound";
const DIREC_BOUND_DESCRIPTION = "Synchronize architectural boundaries with current codebase state.";

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
  const commandBody = readDirecBoundTemplate("command-body.md");
  const skillBody = readDirecBoundTemplate("SKILL.md");

  return [
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE_ID,
      path: paths.commandPath,
      contents: renderCommandArtifact(agent, commandBody),
    },
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE_ID,
      path: paths.skillPath,
      contents: renderSkillArtifact(skillBody),
    },
  ];
}

function renderCommandArtifact(agent: SupportedAgent, commandBody: string): string {
  switch (agent) {
    case "antigravity":
      return ["---", `description: ${DIREC_BOUND_DESCRIPTION}`, "---", "", commandBody, ""].join(
        "\n",
      );
    case "claude":
      return [
        "---",
        'name: "direc-bound"',
        `description: ${DIREC_BOUND_DESCRIPTION}`,
        "category: Workflow",
        "tags: [direc, architecture, boundaries]",
        "---",
        "",
        commandBody,
        "",
      ].join("\n");
    case "codex":
      return ["---", `description: ${DIREC_BOUND_DESCRIPTION}`, "---", "", commandBody, ""].join(
        "\n",
      );
  }
}

function renderSkillArtifact(skillBody: string): string {
  return skillBody;
}

function readDirecBoundTemplate(fileName: string): string {
  const content = readFileSync(new URL(`../templates/direc-bound/${fileName}`, import.meta.url), {
    encoding: "utf8",
  });

  return content.endsWith("\n") ? content : `${content}\n`;
}
