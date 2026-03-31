import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS } from "@spectotal/direc-source-repository";
import { initCommand, runCommand } from "../src/index.js";

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

  const result = await initCommand(repositoryRoot);
  assert.ok(result.config.sources.repository);
  assert.ok(result.config.sources.openspecTasks);
  assert.ok(result.config.sources.openspecSpecs);
  assert.ok(result.config.sources.diff === undefined);
  assert.deepEqual(result.config.sources.repository.options?.excludePaths, [
    ...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  ]);
  assert.ok(result.config.tools.jsComplexity);
  assert.ok(result.config.tools.specDocuments);
  assert.ok(result.config.tools.specConflict);
  assert.ok(result.config.sinks.console);
  assert.deepEqual(
    result.config.pipelines.map((pipeline) => pipeline.id),
    ["repository-quality", "openspec-task-feedback", "openspec-spec-conflicts"],
  );
  const repositoryPipeline = result.config.pipelines.find(
    (pipeline) => pipeline.id === "repository-quality",
  );
  assert.deepEqual(repositoryPipeline?.analysis.facet, ["jsComplexity", "graph"]);
  assert.deepEqual(repositoryPipeline?.analysis.agnostic, ["cluster", "bounds"]);

  const configOnDisk = JSON.parse(
    await readFile(join(repositoryRoot, ".direc", "config.json"), "utf8"),
  ) as {
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
    ["cluster", "bounds"],
  );
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

  const initResult = await initCommand(repositoryRoot);
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
    ["cluster", "bounds"],
  );

  const results = await runCommand(repositoryRoot, "diff-quality");
  assert.equal(results.length, 1);
  assert.ok(results[0]?.artifacts.some((artifact) => artifact.type === "feedback.verdict"));
  assert.ok(
    results[0]?.artifacts.some((artifact) => artifact.type === "evaluation.bounds-distance"),
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
