import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { formatNextStepNotice, getSupportedAgents, scaffoldInitBundles } from "../src/index.js";

test("scaffoldInitBundles writes only requested agent artifacts", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-agent-skills-"));
  const artifacts = await scaffoldInitBundles({
    repositoryRoot,
    agents: ["codex"],
  });

  assert.deepEqual(artifacts.map((artifact) => artifact.path).sort(), [
    ".codex/prompts/direc-bound.md",
    ".codex/skills/direc-bound-architecture/SKILL.md",
  ]);

  assert.equal(
    await pathExists(join(repositoryRoot, ".claude", "commands", "direc-bound.md")),
    false,
  );
  assert.equal(
    await pathExists(join(repositoryRoot, ".agent", "workflows", "direc-bound.md")),
    false,
  );

  const prompt = await readFile(
    join(repositoryRoot, ".codex", "prompts", "direc-bound.md"),
    "utf8",
  );
  const skill = await readFile(
    join(repositoryRoot, ".codex", "skills", "direc-bound-architecture", "SKILL.md"),
    "utf8",
  );

  assert.match(prompt, /\/direc-bound/);
  assert.match(skill, /name: direc-bound-architecture/);
});

test("scaffoldInitBundles keeps canonical command bodies aligned across agents", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-agent-skills-"));
  await scaffoldInitBundles({
    repositoryRoot,
    agents: getSupportedAgents(),
  });

  const antigravityBody = stripFrontmatter(
    await readFile(join(repositoryRoot, ".agent", "workflows", "direc-bound.md"), "utf8"),
  );
  const claudeBody = stripFrontmatter(
    await readFile(join(repositoryRoot, ".claude", "commands", "direc-bound.md"), "utf8"),
  );
  const codexBody = stripFrontmatter(
    await readFile(join(repositoryRoot, ".codex", "prompts", "direc-bound.md"), "utf8"),
  );

  assert.equal(antigravityBody, claudeBody);
  assert.equal(codexBody, claudeBody);
});

test("formatNextStepNotice returns direc-bound guidance", () => {
  assert.equal(formatNextStepNotice("direc-bound", ["codex"]), "Next step: run /direc-bound");
});

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/u, "");
}
