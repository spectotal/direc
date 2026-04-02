import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS } from "@spectotal/direc-source-repository";
import type { SkillAgentId, SkillsPromptSession } from "../src/internal/types.js";
import { parseInitArgs } from "../src/internal/init-args.js";
import { initCommand, runCommand } from "../src/index.js";

const CODEX_AGENT: SkillAgentId[] = ["codex"];

test("initCommand detects facets and materialises facet and agnostic sources, tools, sinks, and pipelines", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-init-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await mkdir(join(repositoryRoot, "openspec", "specs", "demo"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    JSON.stringify({ name: "fixture" }, null, 2),
  );
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const value = 1;\n");
  await writeFile(join(repositoryRoot, "openspec", "specs", "demo", "spec.md"), "# Demo\n");

  const result = await initCommand(repositoryRoot, {
    agents: [...CODEX_AGENT],
  });
  assert.ok(result.config.sources.repository);
  assert.ok(result.config.sources.openspecTasks);
  assert.ok(result.config.sources.openspecSpecs);
  assert.ok(result.config.sources.diff === undefined);
  assert.deepEqual(result.config.skills?.agents, CODEX_AGENT);
  assert.deepEqual(result.config.sources.repository.options?.excludePaths, [
    ...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  ]);
  assert.ok(result.config.tools.jsComplexity);
  assert.ok(result.config.tools.complexityFindings);
  assert.ok(result.config.tools.specDocuments);
  assert.ok(result.config.tools.specConflict);
  assert.ok(result.config.sinks.console);
  assert.ok(result.config.sinks["agent-feedback"]);
  assert.deepEqual(
    result.config.pipelines.map((pipeline) => pipeline.id),
    ["repository-quality", "openspec-task-feedback", "openspec-spec-conflicts"],
  );
  const repositoryPipeline = result.config.pipelines.find(
    (pipeline) => pipeline.id === "repository-quality",
  );
  assert.deepEqual(repositoryPipeline?.analysis.facet, ["jsComplexity", "graph"]);
  assert.deepEqual(repositoryPipeline?.analysis.agnostic, [
    "cluster",
    "bounds",
    "complexityFindings",
  ]);
  assert.deepEqual(repositoryPipeline?.feedback.sinks, ["console", "agent-feedback"]);
  assert.deepEqual(result.skills.deployments, [
    {
      agent: "codex",
      skillId: "chat-complexity-gate",
      deployedPath: join(repositoryRoot, ".codex", "skills", "chat-complexity-gate"),
    },
  ]);

  const configOnDisk = JSON.parse(
    await readFile(join(repositoryRoot, ".direc", "config.json"), "utf8"),
  ) as {
    skills?: { agents: string[] };
    sources: {
      repository: {
        options: {
          excludePaths: string[];
        };
      };
    };
    pipelines: Array<{ id: string; analysis: { facet: string[]; agnostic: string[] } }>;
  };
  assert.equal(configOnDisk.pipelines.length, 3);
  assert.deepEqual(configOnDisk.skills?.agents, CODEX_AGENT);
  assert.deepEqual(configOnDisk.sources.repository.options.excludePaths, [
    ...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  ]);
  assert.deepEqual(
    configOnDisk.pipelines.find((pipeline) => pipeline.id === "openspec-spec-conflicts")?.analysis
      .facet,
    ["specDocuments"],
  );
  assert.deepEqual(
    configOnDisk.pipelines.find((pipeline) => pipeline.id === "repository-quality")?.analysis
      .agnostic,
    ["cluster", "bounds", "complexityFindings"],
  );
  const codexSkill = await readFile(
    join(repositoryRoot, ".codex", "skills", "chat-complexity-gate", "SKILL.md"),
    "utf8",
  );
  assert.match(codexSkill, /Chat Complexity Gate/);
  await assert.rejects(() => stat(join(repositoryRoot, ".direc", "skills")));
});

test("runCommand loads config and executes the facet and agnostic diff pipeline end to end", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-run-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    JSON.stringify({ name: "fixture" }, null, 2),
  );
  await writeFile(
    join(repositoryRoot, "src", "index.ts"),
    "export function run(v:number){ if (v > 1) { return v; } return 0; }\n",
  );
  await git(repositoryRoot, ["init"]);
  await git(repositoryRoot, ["config", "user.email", "direc@example.com"]);
  await git(repositoryRoot, ["config", "user.name", "Direc"]);
  await git(repositoryRoot, ["add", "."]);
  await git(repositoryRoot, ["commit", "-m", "init"]);
  await writeFile(
    join(repositoryRoot, "src", "index.ts"),
    "export function run(v:number){ if (v > 1) { return v; } if (v > 5) { return v + 1; } return 0; }\n",
  );

  const initResult = await initCommand(repositoryRoot, {
    agents: [...CODEX_AGENT],
  });
  assert.ok(initResult.config.sources.repository);
  assert.ok(initResult.config.sources.diff);
  assert.ok(initResult.config.pipelines.some((pipeline) => pipeline.id === "repository-quality"));
  assert.deepEqual(
    initResult.config.pipelines.find((pipeline) => pipeline.id === "diff-quality")?.analysis.facet,
    ["jsComplexity", "graph"],
  );
  assert.deepEqual(
    initResult.config.pipelines.find((pipeline) => pipeline.id === "diff-quality")?.analysis
      .agnostic,
    ["cluster", "bounds", "complexityFindings"],
  );

  const results = await runCommand(repositoryRoot, "diff-quality");
  assert.equal(results.length, 1);
  assert.ok(
    results[0]?.artifacts.some((artifact) => artifact.type === "evaluation.complexity-findings"),
  );
  assert.ok(
    results[0]?.artifacts.some((artifact) => artifact.type === "evaluation.bounds-distance"),
  );
  const agentDelivery = JSON.parse(
    await readFile(
      join(repositoryRoot, ".direc", "latest", "diff-quality", "deliveries", "agent-feedback.json"),
      "utf8",
    ),
  ) as {
    artifacts: Array<{ type: string }>;
  };
  assert.deepEqual(
    agentDelivery.artifacts.map((artifact) => artifact.type),
    ["evaluation.complexity-findings"],
  );
  await assert.rejects(() =>
    stat(join(repositoryRoot, ".direc", "latest", "diff-quality", "deliveries", "console.json")),
  );
});

test("initCommand prompts for agents and installs all bundled skills", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-init-prompt-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    JSON.stringify({ name: "fixture" }, null, 2),
  );
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const value = 1;\n");

  const promptSession: SkillsPromptSession = {
    selectAgents: async () => ["claude", "antigravity"],
    close: () => {},
  };
  const result = await initCommand(repositoryRoot, {
    promptSession,
  });

  assert.deepEqual(result.config.skills?.agents, ["claude", "antigravity"]);

  const claudeSkill = await readFile(
    join(repositoryRoot, ".claude", "skills", "chat-complexity-gate", "SKILL.md"),
    "utf8",
  );
  const antigravitySkill = await readFile(
    join(repositoryRoot, ".agent", "skills", "chat-complexity-gate", "SKILL.md"),
    "utf8",
  );
  assert.match(claudeSkill, /\.direc\/latest\/diff-quality\/deliveries\/agent-feedback\.json/);
  assert.equal(claudeSkill, antigravitySkill);
});

test("initCommand requires --agent in non-interactive mode", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-cli-init-noninteractive-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(
    join(repositoryRoot, "package.json"),
    JSON.stringify({ name: "fixture" }, null, 2),
  );
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const value = 1;\n");

  await assert.rejects(
    () => initCommand(repositoryRoot),
    /requires --agent in non-interactive mode/,
  );
});

test("parseInitArgs rejects duplicate --agent entries", () => {
  assert.throws(
    () => parseInitArgs(["--agent", "codex", "--agent", "codex"]),
    /Duplicate --agent entry for codex/,
  );
});

async function git(repositoryRoot: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`git ${args.join(" ")} failed with code ${code ?? -1}`));
    });
  });
}
