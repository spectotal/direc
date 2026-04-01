import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SkillBundleRecord, SkillDefinition, SkillAgentId } from "../index.js";
import { agentSkillsRoot } from "./paths.js";

export async function syncAgentSkills(options: {
  repositoryRoot: string;
  agentId: SkillAgentId;
  selected: boolean;
  bundledSkillIds: Set<string>;
  catalog: SkillDefinition[];
  partials: Map<string, string>;
  renderSkill: (skill: SkillDefinition, partials: Map<string, string>) => string;
}): Promise<SkillBundleRecord[]> {
  const agentRoot = resolve(options.repositoryRoot, agentSkillsRoot(options.agentId));
  const requestedSkillIds = new Set(
    options.selected ? options.catalog.map((skill) => skill.id) : [],
  );

  if (requestedSkillIds.size > 0) {
    await mkdir(agentRoot, { recursive: true });
  }

  await pruneBundledSkills(agentRoot, options.bundledSkillIds, requestedSkillIds);

  if (!options.selected) {
    return [];
  }

  return Promise.all(
    options.catalog.map((skill) =>
      deployRequestedSkill({
        agentId: options.agentId,
        agentRoot,
        skill,
        partials: options.partials,
        renderSkill: options.renderSkill,
      }),
    ),
  );
}

async function deployRequestedSkill(options: {
  agentId: SkillAgentId;
  agentRoot: string;
  skill: SkillDefinition;
  partials: Map<string, string>;
  renderSkill: (skill: SkillDefinition, partials: Map<string, string>) => string;
}): Promise<SkillBundleRecord> {
  const deployedPath = join(options.agentRoot, options.skill.id);
  await writeDeployedSkill(deployedPath, options.skill, options.partials, options.renderSkill);

  return {
    agent: options.agentId,
    skillId: options.skill.id,
    deployedPath,
  };
}

async function pruneBundledSkills(
  agentRoot: string,
  bundledSkillIds: Set<string>,
  requestedSkillIds: Set<string>,
): Promise<void> {
  const entries = await readAgentEntries(agentRoot);
  const removableEntries = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => bundledSkillIds.has(entry.name))
    .filter((entry) => !requestedSkillIds.has(entry.name));

  await Promise.all(
    removableEntries.map((entry) =>
      rm(join(agentRoot, entry.name), { recursive: true, force: true }),
    ),
  );
}

async function readAgentEntries(agentRoot: string) {
  try {
    return await readdir(agentRoot, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function writeDeployedSkill(
  deployedPath: string,
  skill: SkillDefinition,
  partials: Map<string, string>,
  renderSkill: (skill: SkillDefinition, partials: Map<string, string>) => string,
): Promise<void> {
  await rm(deployedPath, { recursive: true, force: true });
  await mkdir(deployedPath, { recursive: true });
  await writeFile(join(deployedPath, "SKILL.md"), renderSkill(skill, partials), "utf8");

  if (!skill.resourcesPath) {
    return;
  }

  await cp(skill.resourcesPath, join(deployedPath, "resources"), {
    recursive: true,
  });
}
