import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { SkillDefinition } from "../index.js";
import { readScalar, splitFrontmatter } from "./catalog/frontmatter.js";
import {
  resolveBundledDefinitionsDirectory,
  resolveBundledPartialsDirectory as resolveBundledPartialsDirectoryFromPaths,
  resolveOptionalDirectory,
} from "./catalog/paths.js";

export async function loadSkillCatalog(): Promise<SkillDefinition[]> {
  const catalogDirectory = await resolveBundledDefinitionsDirectory();
  const entries = await readdir(catalogDirectory, { withFileTypes: true });
  const loaded: SkillDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const definitionDirectory = join(catalogDirectory, entry.name);
    const sourcePath = join(definitionDirectory, "skill.md");
    const content = await readFile(sourcePath, "utf8");
    const { frontmatter, body } = splitFrontmatter(content);
    const id = readScalar(frontmatter, "id") ?? readScalar(frontmatter, "name") ?? entry.name;
    const description = readScalar(frontmatter, "description") ?? "";
    const resourcesPath = await resolveOptionalDirectory(join(definitionDirectory, "resources"));

    loaded.push({
      id,
      description,
      sourcePath,
      content,
      body,
      resourcesPath,
    });
  }

  return loaded.sort((left, right) => left.id.localeCompare(right.id));
}

export function validateSkillCatalog(catalog: SkillDefinition[]): void {
  const seen = new Set<string>();

  for (const skill of catalog) {
    if (seen.has(skill.id)) {
      throw new Error(`Duplicate skill id: ${skill.id}`);
    }
    if (!skill.description) {
      throw new Error(`Skill ${skill.id} is missing a description.`);
    }
    seen.add(skill.id);
  }
}

export async function resolveBundledPartialsDirectory(): Promise<string> {
  return resolveBundledPartialsDirectoryFromPaths();
}
