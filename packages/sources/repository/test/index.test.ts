import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS, repositorySource } from "../src/index.js";

test("repositorySource emits filtered repository paths", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-repository-source-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await mkdir(join(repositoryRoot, "test"), { recursive: true });
  await mkdir(join(repositoryRoot, "scripts"), { recursive: true });
  await mkdir(join(repositoryRoot, "dist"), { recursive: true });
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const value = 1;\n");
  await writeFile(join(repositoryRoot, "test", "index.ts"), "export const ignored = true;\n");
  await writeFile(join(repositoryRoot, "src", "index.test.ts"), "export const test = true;\n");
  await writeFile(join(repositoryRoot, "scripts", "build.ts"), "export const script = true;\n");
  await writeFile(join(repositoryRoot, "dist", "bundle.js"), "export const dist = true;\n");

  const artifacts = await repositorySource.run({
    repositoryRoot,
    pipelineId: "repository-quality",
    sourceConfig: {
      id: "repository",
      plugin: "repository",
      enabled: true,
      options: {
        excludePaths: [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS],
      },
    },
    projectContext: {
      repositoryRoot,
      facets: [],
      sourceFiles: [],
      hasGit: false,
      hasOpenSpec: false,
    },
    now: () => new Date(),
  });

  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.type, "source.repository.scope");
  assert.deepEqual((artifacts[0]?.payload as { excludePaths: string[] }).excludePaths, [
    ...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS,
  ]);
  assert.deepEqual(artifacts[0]?.scope.paths, [join(repositoryRoot, "src", "index.ts")]);
});

test("repositorySource watch reacts to included file changes and ignores excluded files", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-repository-watch-"));
  await mkdir(join(repositoryRoot, "src"), { recursive: true });
  await writeFile(join(repositoryRoot, "src", "index.ts"), "export const value = 1;\n");
  const sourceConfig = {
    id: "repository",
    plugin: "repository",
    enabled: true,
    options: {
      excludePaths: [...DEFAULT_REPOSITORY_SOURCE_EXCLUDE_PATHS],
      pollIntervalMs: 25,
    },
  };

  let changeCount = 0;
  const handle = await repositorySource.watch!({
    repositoryRoot,
    pipelineId: "repository-quality",
    sourceConfig,
    projectContext: {
      repositoryRoot,
      facets: [],
      sourceFiles: [],
      hasGit: false,
      hasOpenSpec: false,
    },
    now: () => new Date(),
    onChange() {
      changeCount += 1;
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 40));
  await writeFile(join(repositoryRoot, "src", "feature.ts"), "export const feature = 1;\n");
  await waitFor(() => changeCount === 1);

  await mkdir(join(repositoryRoot, "test"), { recursive: true });
  await writeFile(join(repositoryRoot, "test", "ignored.ts"), "export const ignored = true;\n");
  await new Promise((resolve) => setTimeout(resolve, 150));
  handle.close();

  assert.equal(changeCount, 1);
});

async function waitFor(predicate: () => boolean, timeoutMs = 600): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
