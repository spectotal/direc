import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DIREC_BOUND_BUNDLE,
  formatNextStepNotice,
  getSupportedAgents,
  scaffoldInitBundles,
} from "../src/index.js";

test("scaffoldInitBundles writes only requested agent artifacts", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-agent-skills-"));
  const artifacts = await scaffoldInitBundles({
    repositoryRoot,
    agents: ["codex"],
  });

  assert.deepEqual(artifacts.map((artifact) => artifact.path).sort(), [
    DIREC_BOUND_BUNDLE.artifactPaths.codex.commandPath,
    DIREC_BOUND_BUNDLE.artifactPaths.codex.skillPath,
  ]);

  assert.equal(
    await pathExists(join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.claude.commandPath)),
    false,
  );
  assert.equal(
    await pathExists(
      join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.antigravity.commandPath),
    ),
    false,
  );

  const prompt = await readFile(
    join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.codex.commandPath),
    "utf8",
  );
  const skill = await readFile(
    join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.codex.skillPath),
    "utf8",
  );

  assert.match(prompt, new RegExp(`/${DIREC_BOUND_BUNDLE.commandName}`));
  assert.match(prompt, /open a GitHub issue/i);
  assert.match(skill, new RegExp(`name: ${DIREC_BOUND_BUNDLE.skillName}`));
  assert.match(skill, /detected facets and enabled analyzers/);
});

test("scaffoldInitBundles keeps canonical command bodies aligned across agents", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-agent-skills-"));
  await scaffoldInitBundles({
    repositoryRoot,
    agents: getSupportedAgents(),
  });

  const antigravityBody = stripFrontmatter(
    await readFile(
      join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.antigravity.commandPath),
      "utf8",
    ),
  );
  const claudeBody = stripFrontmatter(
    await readFile(
      join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.claude.commandPath),
      "utf8",
    ),
  );
  const codexBody = stripFrontmatter(
    await readFile(
      join(repositoryRoot, DIREC_BOUND_BUNDLE.artifactPaths.codex.commandPath),
      "utf8",
    ),
  );

  assert.equal(antigravityBody, claudeBody);
  assert.equal(codexBody, claudeBody);
});

test("formatNextStepNotice returns direc-bound guidance", () => {
  assert.equal(formatNextStepNotice(DIREC_BOUND_BUNDLE.id), DIREC_BOUND_BUNDLE.nextStepNotice);
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
