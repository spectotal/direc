import assert from "node:assert/strict";
import test from "node:test";
import { formatDoctorReport } from "../src/commands/doctor-output.js";
import { assertConfiguredAnalyzers, formatInitSummary } from "../src/commands/init-output.js";

test("formatDoctorReport renders automation fallback and disabled analyzer reasons", () => {
  const output = formatDoctorReport({
    repositoryRoot: "/tmp/repository",
    checks: [
      {
        ok: true,
        path: "/tmp/repository/.direc/config.json",
        label: "direc config",
      },
    ],
    config: {
      workflow: "direc",
      analyzers: {
        "js-complexity": {
          enabled: true,
        },
      },
      qualityRoutines: {},
    } as never,
    environment: {
      detectedFacets: [{ id: "js" }],
      extensionSources: [],
    } as never,
    resolution: {
      enabled: [],
      disabled: [
        {
          pluginId: "js-architecture-drift",
          reasons: [{ message: "missing prereq" }],
        },
      ],
    } as never,
  });

  assert.match(output, /MISS automation config/);
  assert.match(output, /SKIP js-architecture-drift: missing prereq/);
});

test("init output helpers preserve analyzer validation and summary formatting", () => {
  assert.throws(
    () =>
      assertConfiguredAnalyzers(
        {
          analyzers: {},
        } as never,
        {
          disabled: [{ reasons: [{ message: "No supported facets were detected." }] }],
        } as never,
      ),
    /No supported analyzer set could be resolved/,
  );

  const output = formatInitSummary(
    "/tmp/repository",
    {
      workflow: "direc",
      automation: null,
    } as never,
    {
      detectedFacets: [{ id: "js" }],
      qualityRoutines: { typescript: {} },
      extensionSources: [],
    } as never,
    ["js-complexity"],
    {
      selectedAgents: ["codex"] as never,
      nextStep: "Next step: run /direc-bound",
    },
  );

  assert.match(output, /Enabled analyzers: js-complexity/);
  assert.match(output, /Automation: not configured/);
  assert.match(output, /Scaffolded agents: codex/);
  assert.match(output, /Next step: run \/direc-bound/);
});
