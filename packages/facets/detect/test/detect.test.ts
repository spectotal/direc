import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { detectRepositoryFacets } from "../src/index.js";

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("detectRepositoryFacets returns all matching facets for a mixed workspace", async () => {
  const facets = await detectRepositoryFacets(resolve(fixturesRoot, "mixed-workspace"));
  const facetIds = new Set(facets.map((facet) => facet.id));

  assert.deepEqual([...facetIds].sort(), ["css", "frontend", "js", "tailwind"]);

  const jsFacet = facets.find((facet) => facet.id === "js");
  assert.ok(jsFacet);
  assert.equal(jsFacet?.confidence, "high");
  assert.equal(Array.isArray(jsFacet?.metadata.packageBoundaries), true);
  assert.deepEqual(
    (jsFacet?.metadata.sourcePaths as string[]).includes("packages/web/test/fixtures/story.ts"),
    false,
  );
  assert.deepEqual(
    (jsFacet?.metadata.sourcePaths as string[]).includes("packages/web/src/types.d.ts"),
    false,
  );
});

test("detectRepositoryFacets returns an independent css facet", async () => {
  const facets = await detectRepositoryFacets(resolve(fixturesRoot, "standalone-css"));

  assert.deepEqual(
    facets.map((facet) => facet.id),
    ["css"],
  );
  assert.match(facets[0]?.evidence[0] ?? "", /CSS-related files/);
});

test("detectRepositoryFacets returns no supported facets for unsupported repositories", async () => {
  const facets = await detectRepositoryFacets(resolve(fixturesRoot, "unsupported"));
  assert.deepEqual(facets, []);
});

test("detectRepositoryFacets returns a python facet for python repositories", async () => {
  const facets = await detectRepositoryFacets(resolve(fixturesRoot, "python-project"));
  const pythonFacet = facets.find((facet) => facet.id === "python");

  assert.ok(pythonFacet);
  assert.equal(pythonFacet?.confidence, "high");
  assert.deepEqual(
    (pythonFacet?.metadata.sourcePaths as string[]).includes("tests/test_app.py"),
    true,
  );
  assert.deepEqual(
    (pythonFacet?.metadata.configPaths as string[]).includes("pyproject.toml"),
    true,
  );
});

test("detectRepositoryFacets accepts extension detectors", async () => {
  const facets = await detectRepositoryFacets(resolve(fixturesRoot, "unsupported"), {
    detectors: [
      () => ({
        id: "custom",
        confidence: "high",
        evidence: ["extension"],
        metadata: {},
      }),
    ],
  });

  assert.deepEqual(
    facets.map((facet) => facet.id),
    ["custom"],
  );
});
