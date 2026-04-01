import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type {
  SkillBundleRecord,
  SkillDefinition,
  SkillProviderId,
  SkillsConfig,
  SyncSkillsResult,
} from "../index.js";
import { loadSkillCatalog, validateSkillCatalog } from "./catalog.js";
import { loadPartials, renderTemplate } from "./render.js";

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

      const installedPath = await syncInstalledBundle(
        options.repositoryRoot,
        provider,
        bundlePath,
        skill.id,
      );

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

async function syncInstalledBundle(
  repositoryRoot: string,
  provider: SkillsConfig["providers"][number],
  bundlePath: string,
  skillId: string,
): Promise<string | undefined> {
  if (provider.installMode !== "installed" || !provider.installTarget) {
    return undefined;
  }

  const installedPath = resolve(repositoryRoot, provider.installTarget, skillId);
  await syncDirectory(bundlePath, installedPath);
  return installedPath;
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

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
