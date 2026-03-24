import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadDirecExtensions } from "../src/extensions.js";

test("loadDirecExtensions loads local extension modules", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-extensions-"));
  const extensionPath = join(repositoryRoot, "direc-extension.mjs");

  await writeFile(
    extensionPath,
    [
      "export default {",
      "  analyzers: [{",
      "    id: 'extension-analyzer',",
      "    displayName: 'Extension Analyzer',",
      "    supportedFacets: ['custom'],",
      "    async run(context) {",
      "      return { analyzerId: 'extension-analyzer', timestamp: new Date().toISOString(), repositoryRoot: context.repositoryRoot, event: context.event, findings: [] };",
      "    },",
      "  }],",
      "  facetDetectors: [() => ({ id: 'custom', confidence: 'high', evidence: ['extension'], metadata: {} })],",
      "  qualityAdapters: [{ id: 'extension-quality', displayName: 'Extension Quality', supportedFacets: ['custom'] }],",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  const loaded = await loadDirecExtensions({
    repositoryRoot,
    sources: ["./direc-extension.mjs"],
  });

  assert.deepEqual(loaded.sources, ["./direc-extension.mjs"]);
  assert.equal(loaded.analyzers[0]?.id, "extension-analyzer");
  assert.equal(loaded.facetDetectors.length, 1);
  assert.equal(loaded.qualityAdapters[0]?.id, "extension-quality");
});

test("loadDirecExtensions rejects duplicate analyzer ids", async () => {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "direc-extensions-"));
  const firstPath = join(repositoryRoot, "first-extension.mjs");
  const secondPath = join(repositoryRoot, "second-extension.mjs");

  await writeFile(
    firstPath,
    [
      "export default {",
      "  analyzers: [{ id: 'dup-analyzer', displayName: 'First', supportedFacets: ['js'], async run(context) { return { analyzerId: 'dup-analyzer', timestamp: new Date().toISOString(), repositoryRoot: context.repositoryRoot, event: context.event, findings: [] }; } }],",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    secondPath,
    [
      "export default {",
      "  analyzers: [{ id: 'dup-analyzer', displayName: 'Second', supportedFacets: ['js'], async run(context) { return { analyzerId: 'dup-analyzer', timestamp: new Date().toISOString(), repositoryRoot: context.repositoryRoot, event: context.event, findings: [] }; } }],",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  await assert.rejects(
    () =>
      loadDirecExtensions({
        repositoryRoot,
        sources: ["./first-extension.mjs", "./second-extension.mjs"],
      }),
    /Duplicate analyzer id detected: dup-analyzer/,
  );
});
