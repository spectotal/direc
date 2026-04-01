import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadSkillCatalog, syncSkills } from "../src/index.js";

test("loadSkillCatalog reads the bundled chat complexity gate template", async () => {
  const catalog = await loadSkillCatalog();

  assert.equal(catalog.length, 1);
  assert.equal(catalog[0]?.id, "chat-complexity-gate");
  assert.match(catalog[0]?.body ?? "", /Chat Complexity Gate/);
});

test("syncSkills deploys all bundled skills into selected native agent folders", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-skills-sync-"));

  const result = await syncSkills({
    repositoryRoot,
    config: {
      agents: ["codex", "claude", "antigravity"],
    },
  });

  const codexSkillDir = join(repositoryRoot, ".codex", "skills", "chat-complexity-gate");
  const claudeSkillDir = join(repositoryRoot, ".claude", "skills", "chat-complexity-gate");
  const antigravitySkillDir = join(repositoryRoot, ".agent", "skills", "chat-complexity-gate");
  const codex = await readFile(join(codexSkillDir, "SKILL.md"), "utf8");
  const claude = await readFile(join(claudeSkillDir, "SKILL.md"), "utf8");
  const antigravity = await readFile(join(antigravitySkillDir, "SKILL.md"), "utf8");

  assert.equal(result.deployments.length, 3);
  assert.match(codex, /\.direc\/latest\/diff-quality\/deliveries\/agent-feedback\.json/);
  assert.equal(codex, claude);
  assert.equal(claude, antigravity);
  assert.deepEqual(await readdir(codexSkillDir), ["SKILL.md"]);
  assert.deepEqual(await readdir(claudeSkillDir), ["SKILL.md"]);
  await assert.rejects(() => stat(join(repositoryRoot, ".direc", "skills")));
});

test("syncSkills prunes bundled skills without touching unrelated skill folders", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-skills-prune-"));
  const customSkillPath = join(repositoryRoot, ".codex", "skills", "custom-user-skill", "SKILL.md");

  await mkdir(join(repositoryRoot, ".codex", "skills", "custom-user-skill"), { recursive: true });
  await writeFile(customSkillPath, "# custom\n", "utf8");

  await syncSkills({
    repositoryRoot,
    config: {
      agents: ["codex"],
    },
  });

  await syncSkills({
    repositoryRoot,
    config: {
      agents: [],
    },
  });

  await assert.rejects(() =>
    readFile(join(repositoryRoot, ".codex", "skills", "chat-complexity-gate", "SKILL.md"), "utf8"),
  );
  assert.equal(await readFile(customSkillPath, "utf8"), "# custom\n");
});
