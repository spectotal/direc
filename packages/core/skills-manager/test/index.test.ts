import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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

test("syncSkills renders the bundled chat complexity gate for selected providers", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-skills-sync-"));

  await syncSkills({
    repositoryRoot,
    config: {
      providers: [
        {
          id: "codex",
          bundleDir: ".direc/skills/codex",
          installTarget: ".codex/skills",
          installMode: "installed",
        },
        {
          id: "claude",
          bundleDir: ".direc/skills/claude",
          installMode: "bundle-only",
        },
      ],
    },
    now: () => new Date("2026-03-31T00:00:00.000Z"),
  });

  const codex = await readFile(
    join(repositoryRoot, ".direc", "skills", "codex", "chat-complexity-gate", "SKILL.md"),
    "utf8",
  );
  const installed = await readFile(
    join(repositoryRoot, ".codex", "skills", "chat-complexity-gate", "SKILL.md"),
    "utf8",
  );
  const claudeManifest = JSON.parse(
    await readFile(
      join(repositoryRoot, ".direc", "skills", "claude", "chat-complexity-gate", "manifest.json"),
      "utf8",
    ),
  ) as { provider: string };

  assert.match(codex, /Do not finish while `js-complexity` is blocking\./);
  assert.equal(codex, installed);
  assert.equal(claudeManifest.provider, "claude");
});
