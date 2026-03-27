import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { initCommand, runCommand } from "../src/index.js";

test("initCommand detects facets and materialises staged sources, tools, sinks, and pipelines", async () => {
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
  assert.ok(result.config.sources.openspecTasks);
  assert.ok(result.config.sources.openspecSpecs);
  assert.ok(result.config.sources.diff === undefined);
  assert.ok(result.config.tools.complexity);
  assert.ok(result.config.tools.specDocuments);
  assert.ok(result.config.tools.specConflict);
  assert.ok(result.config.sinks.console);
  assert.deepEqual(
    result.config.pipelines.map((pipeline) => pipeline.id),
    ["openspec-task-feedback", "openspec-spec-conflicts"],
  );
  assert.deepEqual(result.config.pipelines[0]?.analysis.extractors, ["complexity", "graph"]);
  assert.deepEqual(result.config.pipelines[0]?.analysis.derivers, ["cluster"]);
  assert.deepEqual(result.config.pipelines[0]?.analysis.evaluators, ["bounds"]);

  const configOnDisk = JSON.parse(
    await readFile(join(repositoryRoot, ".direc", "config.json"), "utf8"),
  ) as {
    pipelines: Array<{ analysis: { extractors: string[] } }>;
  };
  assert.equal(configOnDisk.pipelines.length, 2);
  assert.deepEqual(configOnDisk.pipelines[1]?.analysis.extractors, ["specDocuments"]);
});

test("runCommand loads config and executes the staged diff pipeline end to end", async () => {
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
  assert.ok(initResult.config.sources.diff);
  assert.deepEqual(initResult.config.pipelines[0]?.analysis.extractors, ["complexity", "graph"]);

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
