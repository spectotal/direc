import { readFileSync } from "node:fs";
import { DIREC_BOUND_BUNDLE, type ScaffoldBundleId, type SupportedAgent } from "./types.js";

type RelativeArtifact = {
  agent: SupportedAgent;
  bundleId: ScaffoldBundleId;
  path: string;
  contents: string;
};

export function renderDirecBoundArtifacts(agent: SupportedAgent): RelativeArtifact[] {
  const paths = DIREC_BOUND_BUNDLE.artifactPaths[agent];
  const commandBody = readDirecBoundTemplate("command-body.md");
  const skillBody = readDirecBoundTemplate("SKILL.md");

  return [
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE.id,
      path: paths.commandPath,
      contents: renderCommandArtifact(agent, commandBody),
    },
    {
      agent,
      bundleId: DIREC_BOUND_BUNDLE.id,
      path: paths.skillPath,
      contents: renderSkillArtifact(skillBody),
    },
  ];
}

function renderCommandArtifact(agent: SupportedAgent, commandBody: string): string {
  switch (agent) {
    case "antigravity":
      return [
        "---",
        `description: ${DIREC_BOUND_BUNDLE.description}`,
        "---",
        "",
        commandBody,
        "",
      ].join("\n");
    case "claude":
      return [
        "---",
        `name: "${DIREC_BOUND_BUNDLE.commandName}"`,
        `description: ${DIREC_BOUND_BUNDLE.description}`,
        "category: Workflow",
        "tags: [direc, architecture, boundaries]",
        "---",
        "",
        commandBody,
        "",
      ].join("\n");
    case "codex":
      return [
        "---",
        `description: ${DIREC_BOUND_BUNDLE.description}`,
        "---",
        "",
        commandBody,
        "",
      ].join("\n");
  }
}

function renderSkillArtifact(skillBody: string): string {
  return skillBody;
}

function readDirecBoundTemplate(fileName: string): string {
  const content = readFileSync(
    new URL(`../templates/${DIREC_BOUND_BUNDLE.templateDirectory}/${fileName}`, import.meta.url),
    {
      encoding: "utf8",
    },
  );

  return content.endsWith("\n") ? content : `${content}\n`;
}
