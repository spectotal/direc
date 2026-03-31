import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const PARTIAL_INCLUDE_PATTERN = /\{\{\s*>\s*([a-z0-9-]+)\s*\}\}/gi;
const VARIABLE_PATTERN = /\{\{\s*([a-z0-9_-]+)\s*\}\}/gi;

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

export async function syncSkills(options: {
  repositoryRoot: string;
  config: SkillsConfig;
  now?: () => Date;
}): Promise<SyncSkillsResult> {
  const now = options.now ?? (() => new Date());
  const catalog = await loadSkillCatalog();
  validateSkillCatalog(catalog);
  const partials = await loadPartials();
  const bundles: SkillBundleRecord[] = [];

  for (const provider of options.config.providers) {
    const bundleRoot = resolve(options.repositoryRoot, provider.bundleDir);
    await rm(bundleRoot, { recursive: true, force: true });
    await mkdir(bundleRoot, { recursive: true });

    for (const skill of catalog) {
      const renderedContent = renderTemplate(skill.content, partials, {
        id: skill.id,
        description: skill.description,
      });
      const renderedBody = renderTemplate(skill.body, partials, {
        id: skill.id,
        description: skill.description,
      });
      const bundlePath = join(bundleRoot, skill.id);

      await writeProviderBundle({
        provider: provider.id,
        bundlePath,
        skill,
        renderedContent,
        renderedBody,
        generatedAt: now().toISOString(),
      });

      let installedPath: string | undefined;
      if (provider.installMode === "installed" && provider.installTarget) {
        installedPath = resolve(options.repositoryRoot, provider.installTarget, skill.id);
        await syncDirectory(bundlePath, installedPath);
      }

      bundles.push({
        provider: provider.id,
        skillId: skill.id,
        bundlePath,
        installedPath,
      });
    }
  }

  return {
    bundles,
  };
}

async function loadPartials(): Promise<Map<string, string>> {
  const partialsRoot = await resolveBundledPartialsDirectory();
  const partials = new Map<string, string>();
  const entries = await readdir(partialsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    partials.set(
      entry.name.replace(/\.md$/u, ""),
      await readFile(join(partialsRoot, entry.name), "utf8"),
    );
  }

  return partials;
}

function renderTemplate(
  content: string,
  partials: Map<string, string>,
  variables: Record<string, string>,
): string {
  return content
    .replace(PARTIAL_INCLUDE_PATTERN, (_, name: string) => {
      const partial = partials.get(name);
      if (partial === undefined) {
        throw new Error(`Unknown skill partial: ${name}`);
      }
      return partial;
    })
    .replace(VARIABLE_PATTERN, (match, name: string) => {
      const value = variables[name];
      if (value === undefined) {
        return match;
      }
      return value;
    });
}

async function writeProviderBundle(options: {
  provider: SkillProviderId;
  bundlePath: string;
  skill: SkillDefinition;
  renderedContent: string;
  renderedBody: string;
  generatedAt: string;
}): Promise<void> {
  await rm(options.bundlePath, { recursive: true, force: true });
  await mkdir(options.bundlePath, { recursive: true });

  switch (options.provider) {
    case "codex":
      await writeFile(join(options.bundlePath, "SKILL.md"), options.renderedContent, "utf8");
      break;
    case "claude":
    case "antigravity":
      await writeFile(join(options.bundlePath, "INSTRUCTIONS.md"), options.renderedBody, "utf8");
      await writeJson(join(options.bundlePath, "manifest.json"), {
        provider: options.provider,
        id: options.skill.id,
        description: options.skill.description,
        generatedAt: options.generatedAt,
      });
      break;
  }

  if (options.skill.resourcesPath) {
    await cp(options.skill.resourcesPath, join(options.bundlePath, "resources"), {
      recursive: true,
    });
  }
}

async function syncDirectory(source: string, target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (!match) {
    return {
      frontmatter: "",
      body: content,
    };
  }

  return {
    frontmatter: match[1] ?? "",
    body: match[2] ?? "",
  };
}

function readScalar(frontmatter: string, field: string): string | undefined {
  const pattern = new RegExp(`^${field}:\\s*(.+)$`, "mu");
  const match = pattern.exec(frontmatter);
  const value = match?.[1]?.trim();
  if (!value) {
    return undefined;
  }

  return value.replace(/^['"]|['"]$/gu, "");
}

async function resolveOptionalDirectory(path: string): Promise<string | undefined> {
  try {
    const result = await stat(path);
    return result.isDirectory() ? path : undefined;
  } catch {
    return undefined;
  }
}

async function resolveBundledDefinitionsDirectory(): Promise<string> {
  return resolveBundledDirectory("definitions");
}

async function resolveBundledPartialsDirectory(): Promise<string> {
  return resolveBundledDirectory("partials");
}

async function resolveBundledDirectory(segment: string): Promise<string> {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(currentDirectory, "..", "catalog", segment),
    resolve(currentDirectory, "../..", "catalog", segment),
  ];

  for (const candidate of candidates) {
    const bundledDirectory = await resolveOptionalDirectory(candidate);
    if (bundledDirectory) {
      return bundledDirectory;
    }
  }

  throw new Error(`Bundled skills ${segment} directory not found.`);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
